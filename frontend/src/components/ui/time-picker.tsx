"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

// Utility function for class merging
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface TimeValue {
  hours: number
  minutes: number
  seconds?: number
  period?: "AM" | "PM"
}

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  onClose?: () => void
  format?: "12h" | "24h"
  showSeconds?: boolean
  minuteStep?: number | number[]
  hourStep?: number
  disabled?: boolean
  className?: string
}

interface TimePickerItemProps {
  value: number | string
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}

// ============================================================================
// TIME PICKER ITEM COMPONENT
// ============================================================================

function TimePickerItem({
  value,
  selected = false,
  disabled = false,
  onClick,
  className,
}: Readonly<TimePickerItemProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-md transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        selected &&
          "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      data-slot="time-picker-item"
    >
      {typeof value === "number" ? value.toString().padStart(2, "0") : value}
    </button>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseTimeString(
  timeStr: string,
  format: "12h" | "24h"
): TimeValue | null {
  if (!timeStr) return null

  const time12Regex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i
  const time24Regex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

  let match
  if (format === "12h") {
    match = time12Regex.exec(timeStr)
    if (match) {
      return {
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
        seconds: match[3] ? parseInt(match[3]) : undefined,
        period: match[4].toUpperCase() as "AM" | "PM",
      }
    }
  } else {
    match = time24Regex.exec(timeStr)
    if (match) {
      return {
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
        seconds: match[3] ? parseInt(match[3]) : undefined,
      }
    }
  }

  return null
}

function formatTimeValue(
  timeValue: TimeValue,
  format: "12h" | "24h",
  showSeconds: boolean
): string {
  const { hours, minutes, seconds, period } = timeValue

  const formattedHours = hours.toString().padStart(2, "0")
  const formattedMinutes = minutes.toString().padStart(2, "0")
  const formattedSeconds =
    showSeconds && seconds !== undefined
      ? `:${seconds.toString().padStart(2, "0")}`
      : ""

  if (format === "12h") {
    return `${formattedHours}:${formattedMinutes}${formattedSeconds} ${period}`
  }

  return `${formattedHours}:${formattedMinutes}${formattedSeconds}`
}

// ============================================================================
// MAIN TIME PICKER COMPONENT
// Just the picker content — no Popover, no trigger button.
// Compose it with InputGroup + Popover the same way as Calendar.
// ============================================================================

function TimePicker({
  value = "",
  onChange,
  onClose,
  format = "24h",
  showSeconds = false,
  minuteStep = 1,
  hourStep = 1,
  disabled = false,
  className,
}: Readonly<TimePickerProps>) {
  const [timeValue, setTimeValue] = React.useState<TimeValue>(() => {
    if (value) {
      const parsed = parseTimeString(value, format)
      if (parsed) return parsed
    }
    return {
      hours: format === "12h" ? 12 : 0,
      minutes: 0,
      seconds: showSeconds ? 0 : undefined,
      period: format === "12h" ? "AM" : undefined,
    }
  })

  const [originalValue, setOriginalValue] = React.useState<TimeValue>(timeValue)

  // Sync when value prop changes externally
  React.useEffect(() => {
    if (value) {
      const parsed = parseTimeString(value, format)
      if (parsed) {
        setTimeValue(parsed)
        setOriginalValue(parsed)
      }
    }
  }, [value, format])

  const hourOptions = React.useMemo(() => {
    const max = format === "12h" ? 12 : 23
    const min = format === "12h" ? 1 : 0
    const options = []
    for (let i = min; i <= max; i += hourStep) options.push(i)
    return options
  }, [format, hourStep])

  const minuteOptions = React.useMemo(() => {
    if (Array.isArray(minuteStep)) return minuteStep
    const options = []
    for (let i = 0; i < 60; i += minuteStep) options.push(i)
    return options
  }, [minuteStep])

  const secondOptions = React.useMemo(() => {
    if (!showSeconds) return []
    const options = []
    for (let i = 0; i < 60; i++) options.push(i)
    return options
  }, [showSeconds])

  const handleTimeChange = (field: keyof TimeValue, newValue: number | string) => {
    setTimeValue((prev) => ({ ...prev, [field]: newValue }))
  }

  const handleConfirm = () => {
    const timeString = formatTimeValue(timeValue, format, showSeconds)
    onChange?.(timeString)
    setOriginalValue({ ...timeValue })
    onClose?.()
  }

  const handleCancel = () => {
    setTimeValue({ ...originalValue })
    onClose?.()
  }

  const gridColsClass = showSeconds && format === "12h"
    ? "grid-cols-4"
    : showSeconds || format === "12h"
      ? "grid-cols-3"
      : "grid-cols-2"

  return (
    <div className={cn("w-[200px] p-2 space-y-4", className)} data-slot="time-picker-content">
      <div className={cn("grid gap-1", gridColsClass)}>
        {/* Hours Column */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Hours</p>
          <div className="h-48 overflow-y-auto space-y-1 p-0.5">
            {hourOptions.map((hour) => (
              <TimePickerItem
                key={hour}
                value={hour}
                selected={timeValue.hours === hour}
                onClick={() => handleTimeChange("hours", hour)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* Minutes Column */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Minutes</p>
          <div className="h-48 overflow-y-auto space-y-1 p-0.5">
            {minuteOptions.map((minute) => (
              <TimePickerItem
                key={minute}
                value={minute}
                selected={timeValue.minutes === minute}
                onClick={() => handleTimeChange("minutes", minute)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* Seconds Column */}
        {showSeconds && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Seconds</p>
            <div className="h-48 overflow-y-auto space-y-1 p-0.5">
              {secondOptions.map((second) => (
                <TimePickerItem
                  key={second}
                  value={second}
                  selected={timeValue.seconds === second}
                  onClick={() => handleTimeChange("seconds", second)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        )}

        {/* AM/PM Column */}
        {format === "12h" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Period</p>
            <div className="h-48 flex flex-col space-y-1 p-0.5">
              <TimePickerItem
                value="AM"
                selected={timeValue.period === "AM"}
                onClick={() => handleTimeChange("period", "AM")}
                disabled={disabled}
              />
              <TimePickerItem
                value="PM"
                selected={timeValue.period === "PM"}
                onClick={() => handleTimeChange("period", "PM")}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={disabled}>
          Confirm
        </Button>
      </div>
    </div>
  )
}

export { TimePicker, TimePickerItem }
export type { TimePickerProps, TimePickerItemProps, TimeValue }
