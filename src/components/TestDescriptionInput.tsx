import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface TestDescriptionInputProps {
  value: TestDescription;
  onChange: (value: TestDescription) => void;
}

interface TestDescription {
  type: "ui" | "flow" | "integration";
  name: string;
  description: string;
  parameters: {
    startUrl: string;
    expectations: string[];
    preconditions?: string[];
  };
}

export function TestDescriptionInput({ value, onChange }: TestDescriptionInputProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Test Type</Label>
        <Select 
          value={value.type} 
          onValueChange={(type) => onChange({ ...value, type: type as TestDescription["type"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select test type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ui">UI Test</SelectItem>
            <SelectItem value="flow">User Flow</SelectItem>
            <SelectItem value="integration">Integration Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Test Name</Label>
        <Textarea 
          placeholder="e.g., Login Flow Validation"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="h-8"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          placeholder="Describe what this test should verify..."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="h-20"
        />
      </div>

      <div className="space-y-2">
        <Label>Expectations (one per line)</Label>
        <Textarea 
          placeholder="- User should be logged in
- Dashboard should show welcome message
- User menu should be visible"
          value={value.parameters.expectations.join('\n')}
          onChange={(e) => onChange({
            ...value,
            parameters: {
              ...value.parameters,
              expectations: e.target.value.split('\n').filter(Boolean)
            }
          })}
          className="h-32 font-mono"
        />
      </div>
    </Card>
  );
} 