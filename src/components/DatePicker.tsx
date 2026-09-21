import { utcParse } from 'd3';
import { useState } from 'react';

import { formatDate } from '../utils';

interface DatePickerProps {
    time: number;
    minDate: Date;
    maxDate: Date;
    onChange: (time: number) => void;
}

const parseDate = utcParse('%Y/%m/%d');

export default function DatePicker({ time, minDate, maxDate, onChange }: DatePickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="group relative flex"
            onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                aria-label="Choose timeline date"
                aria-expanded={open}
                aria-haspopup="dialog"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setOpen(open => !open)}
                className="text-ink hover:text-accent group-focus-within:text-accent cursor-pointer
                    font-mono text-sm tracking-wider tabular-nums"
            >
                {formatDate(new Date(time))}
            </button>
            {open && (
                <form
                    role="dialog"
                    aria-label="Choose timeline date"
                    className="tooltip pointer-events-auto bottom-full left-1/2 mb-3
                        -translate-x-1/2 px-3 pt-3 pb-4"
                    onSubmit={e => {
                        e.preventDefault();
                        const input = e.currentTarget.querySelector('input')!;
                        const value = input.value.trim();
                        const date = parseDate(value);
                        const error =
                            !date || formatDate(date) !== value
                                ? 'Enter a valid date in YYYY/MM/DD format.'
                                : date < minDate || date > maxDate
                                  ? `Choose a date from ${formatDate(minDate)} to ${formatDate(maxDate)}.`
                                  : '';
                        input.setCustomValidity(error);
                        if (input.reportValidity()) {
                            onChange(date!.getTime());
                            setOpen(false);
                        }
                    }}
                >
                    <input
                        type="text"
                        aria-label="Date (YYYY/MM/DD)"
                        placeholder="YYYY/MM/DD"
                        defaultValue={formatDate(new Date(time))}
                        autoComplete="off"
                        enterKeyHint="go"
                        required
                        autoFocus
                        onFocus={e => e.currentTarget.select()}
                        onInput={e => e.currentTarget.setCustomValidity('')}
                        className="border-rule w-32 border-b bg-transparent pb-1 font-mono text-sm"
                    />
                    <span className="meta mt-1 block">Enter to apply</span>
                    <span
                        className="tooltip-arrow -bottom-1 left-1/2 -translate-x-1/2 border-r
                            border-b"
                    />
                </form>
            )}
        </div>
    );
}
