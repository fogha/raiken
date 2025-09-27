#!/bin/bash

# Contabo Server Deployment Setup Script
# This script helps you set up the required secrets and server configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Contabo Server Deployment Setup"
echo "=================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    print_error "Could not determine repository URL. Make sure you have a remote origin set."
    exit 1
fi

print_status "Repository: $REPO_URL"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_warning "GitHub CLI (gh) is not installed. You'll need to set secrets manually."
    echo ""
    echo "To install GitHub CLI:"
    echo "  macOS: brew install gh"
    echo "  Ubuntu: sudo apt install gh"
    echo "  Or visit: https://cli.github.com/"
    echo ""
    read -p "Do you want to continue with manual setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    MANUAL_SETUP=true
else
    MANUAL_SETUP=false
fi

echo ""
print_status "Setting up GitHub Secrets for Contabo deployment..."
echo ""

# Collect required information
echo "Please provide the following information for your Contabo server:"
echo ""

read -p "Contabo server IP address: " CONTABO_HOST
read -p "SSH username (usually 'root'): " CONTABO_USERNAME
read -p "SSH port (default 22): " CONTABO_PORT
CONTABO_PORT=${CONTABO_PORT:-22}

read -p "Your domain name (e.g., raiken.yourdomain.com): " APP_DOMAIN
read -p "Your email address (for SSL certificates): " ADMIN_EMAIL
read -p "OpenRouter API key (sk-or-...): " OPENROUTER_API_KEY

echo ""
print_status "SSH Key Setup"
echo "==============="
echo ""

# Check for existing SSH key
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY_PATH" ]; then
    print_warning "No SSH key found at $SSH_KEY_PATH"
    echo "You need to:"
    echo "1. Generate an SSH key: ssh-keygen -t rsa -b 4096 -C 'your-email@example.com'"
    echo "2. Copy the public key to your Contabo server: ssh-copy-id $CONTABO_USERNAME@$CONTABO_HOST"
    echo "3. Test the connection: ssh $CONTABO_USERNAME@$CONTABO_HOST"
    echo ""
    read -p "Have you completed the SSH key setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please complete the SSH key setup first"
        exit 1
    fi
fi

# Test SSH connection
print_status "Testing SSH connection to $CONTABO_HOST..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes $CONTABO_USERNAME@$CONTABO_HOST exit 2>/dev/null; then
    print_success "SSH connection successful"
else
    print_error "SSH connection failed. Please check your SSH key setup."
    exit 1
fi

echo ""
print_status "Setting up GitHub Secrets..."
echo ""

if [ "$MANUAL_SETUP" = true ]; then
    echo "Please set the following secrets in your GitHub repository:"
    echo ""
    echo "Go to: https://github.com/$(echo $REPO_URL | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/')/settings/secrets/actions"
    echo ""
    echo "Add these secrets:"
    echo "  CONTABO_HOST = $CONTABO_HOST"
    echo "  CONTABO_USERNAME = $CONTABO_USERNAME"
    echo "  CONTABO_PORT = $CONTABO_PORT"
    echo "  CONTABO_SSH_KEY = $(cat $SSH_KEY_PATH)"
    echo "  APP_DOMAIN = $APP_DOMAIN"
    echo "  ADMIN_EMAIL = $ADMIN_EMAIL"
    echo "  OPENROUTER_API_KEY = $OPENROUTER_API_KEY"
    echo "  NEXT_PUBLIC_BASE_URL = https://$APP_DOMAIN"
    echo ""
else
    # Set secrets using GitHub CLI
    print_status "Setting GitHub secrets..."
    
    gh secret set CONTABO_HOST --body "$CONTABO_HOST"
    gh secret set CONTABO_USERNAME --body "$CONTABO_USERNAME"
    gh secret set CONTABO_PORT --body "$CONTABO_PORT"
    gh secret set CONTABO_SSH_KEY --body "$(cat $SSH_KEY_PATH)"
    gh secret set APP_DOMAIN --body "$APP_DOMAIN"
    gh secret set ADMIN_EMAIL --body "$ADMIN_EMAIL"
    gh secret set OPENROUTER_API_KEY --body "$OPENROUTER_API_KEY"
    gh secret set NEXT_PUBLIC_BASE_URL --body "https://$APP_DOMAIN"
    
    print_success "GitHub secrets set successfully"
fi

echo ""
print_status "Server Preparation"
echo "======================"
echo ""

# Create server setup script
cat > server-setup.sh << 'EOF'
#!/bin/bash

# Contabo Server Setup Script
# Run this script on your Contabo server to prepare it for deployment

set -e

echo "🚀 Setting up Contabo server for Raiken deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Install Nginx
echo "🌐 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "✅ Nginx installed successfully"
else
    echo "✅ Nginx already installed"
fi

# Install Certbot
echo "🔒 Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed successfully"
else
    echo "✅ Certbot already installed"
fi

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/raiken
chown $USER:$USER /opt/raiken

echo "✅ Server setup completed!"
echo ""
echo "Your server is now ready for deployment."
echo "The GitHub Actions workflow will handle the rest when you push to main."
EOF

chmod +x server-setup.sh

print_status "Created server-setup.sh script"
echo ""
echo "Next steps:"
echo "1. Copy server-setup.sh to your Contabo server:"
echo "   scp server-setup.sh $CONTABO_USERNAME@$CONTABO_HOST:/tmp/"
echo ""
echo "2. Run the setup script on your server:"
echo "   ssh $CONTABO_USERNAME@$CONTABO_HOST 'bash /tmp/server-setup.sh'"
echo ""
echo "3. Push your code to main branch to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'Setup Contabo deployment'"
echo "   git push origin main"
echo ""

# Clean up
rm server-setup.sh

print_success "Setup completed!"
echo ""
echo "🎉 Your Contabo server deployment is now configured!"
echo "📋 Summary:"
echo "   Server: $CONTABO_HOST"
echo "   Domain: $APP_DOMAIN"
echo "   SSH User: $CONTABO_USERNAME"
echo "   SSH Port: $CONTABO_PORT"
echo ""
echo "🚀 Push to main branch to deploy!"
