"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SUPPORTED_MODELS } from "@/core/testing/services/openrouter.service"

export function ModelSelector() {
  const [open, setOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<string>("anthropic/claude-3-sonnet")
  
  // Load saved model from localStorage on initial render
  React.useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('artenConfig')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        if (config.api?.model) {
          setSelectedModel(config.api.model)
        }
      }
    } catch (error) {
      console.error('Error loading model from localStorage:', error)
    }
  }, [])
  
  // Save selected model to localStorage
  const saveModelSelection = (modelId: string) => {
    try {
      const savedConfig = localStorage.getItem('artenConfig') || '{}'
      const config = JSON.parse(savedConfig)
      
      // Update the model in the config
      config.api = config.api || {}
      config.api.model = modelId
      
      // Save back to localStorage
      localStorage.setItem('artenConfig', JSON.stringify(config))
    } catch (error) {
      console.error('Error saving model to localStorage:', error)
    }
  }

  // Handle model selection
  const onModelSelect = (currentValue: string) => {
    setSelectedModel(currentValue)
    setOpen(false)
    saveModelSelection(currentValue)
  }

  // Find the selected model name
  const selectedModelName = SUPPORTED_MODELS.find(model => model === selectedModel) || "Select Model"

  return (
    <Popover open={open}  onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[140px] mr-2 text-[12px] h-8 justify-between"
        >
          {selectedModelName}
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] mr-2 p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
                            {SUPPORTED_MODELS.map((model) => (
              <CommandItem
                key={model}
                value={model}
                onSelect={onModelSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 text-[18px]",
                    selectedModel === model ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{model}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
