'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronsUpDown, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getCountryList, type Country } from '../constants/countries';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function parseDialCode(value: string): string {
  // Extract the leading +XXX dial code from the phone value
  const match = value.match(/^(\+\d+)/);
  return match ? match[1] : '';
}

function stripDialCode(value: string, dial: string): string {
  if (value.startsWith(dial)) {
    return value.slice(dial.length).trim();
  }
  return value;
}

export function PhoneInput({
  value = '',
  onChange,
  disabled = false,
  placeholder = '+1 (555) 000-0000',
}: PhoneInputProps) {
  const countries = useMemo(() => getCountryList(), []);
  const [open, setOpen] = useState(false);

  const currentDial = parseDialCode(value);
  const selectedCountry = useMemo(
    () => countries.find((c) => c.dial === currentDial),
    [countries, currentDial],
  );

  const localNumber = selectedCountry
    ? stripDialCode(value, selectedCountry.dial)
    : value;

  const handleCountrySelect = useCallback(
    (country: Country) => {
      if (country.dial !== selectedCountry?.dial) {
        onChange?.(country.dial);
      }
      setOpen(false);
    },
    [onChange, selectedCountry],
  );

  const handleLocalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLocal = e.target.value;
      // Only allow digits, spaces, dashes, parens
      const filtered = newLocal.replace(/[^\d\s\-()]/g, '');
      const prefix = selectedCountry?.dial || '+';
      onChange?.(`${prefix} ${filtered}`.trim());
    },
    [onChange, selectedCountry],
  );

  return (
    <div className="flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[100px] shrink-0 rounded-r-none border-r-0 justify-between gap-1 px-2"
          >
            {selectedCountry ? (
              <span className="flex items-center gap-1 text-sm">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.dial}</span>
              </span>
            ) : (
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup className="max-h-[240px] overflow-y-auto">
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dial} ${country.code}`}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCountry?.code === country.code
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    <span className="mr-2">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {country.dial}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={localNumber}
        onChange={handleLocalChange}
        disabled={disabled}
        placeholder={placeholder}
        className="rounded-l-none flex-1"
      />
    </div>
  );
}
