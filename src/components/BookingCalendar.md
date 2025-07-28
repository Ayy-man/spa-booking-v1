# BookingCalendar Component

A beautiful, premium spa-themed booking calendar component built with React, FullCalendar, and Tailwind CSS. Features luxury aesthetics with glassmorphism effects, smooth animations, and comprehensive booking functionality.

## Features

### 🎨 Premium Spa Aesthetic
- **Luxury Color Palette**: Soft, calming colors (spa blues, cream whites, sage greens)
- **Glassmorphism Effects**: Beautiful backdrop blur and transparency
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Premium Typography**: Clean, readable fonts with perfect spacing
- **Subtle Gradients**: Natural, organic gradient backgrounds

### 📅 FullCalendar Integration
- **Multiple Views**: Month, week, and day views with custom styling
- **Interactive Time Slots**: Click to select available appointment times
- **Service-based Filtering**: Different visual styles for service categories
- **Responsive Design**: Optimized for mobile and desktop experiences
- **Custom Theming**: Fully themed FullCalendar with spa aesthetics

### 🛠 Technical Features
- **TypeScript**: Full type safety with comprehensive interfaces
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
- **Mobile-first**: Responsive design starting from mobile
- **Performance**: Optimized rendering and state management
- **Error Handling**: Graceful error states with recovery options

## Installation

The component requires the following dependencies (already included in the project):

```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
npm install framer-motion lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-select
```

## Usage

### Basic Implementation

```tsx
import BookingCalendar from '@/components/BookingCalendar'
import { Service, TimeSlot, BookingFormData } from '@/types'

const MyBookingPage = () => {
  const services: Service[] = [
    {
      id: '1',
      name: 'Swedish Massage',
      description: 'Relaxing full-body massage',
      duration: 60,
      price: 120,
      category: 'massage',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  const availableTimeSlots: TimeSlot[] = [
    {
      start: '2024-01-15T10:00:00',
      end: '2024-01-15T11:00:00',
      available: true
    }
  ]

  const handleBookingSubmit = async (data: BookingFormData) => {
    // Handle booking submission
    console.log('Booking submitted:', data)
  }

  return (
    <BookingCalendar
      services={services}
      availableTimeSlots={availableTimeSlots}
      onBookingSubmit={handleBookingSubmit}
    />
  )
}
```

### Advanced Usage with Hook

```tsx
import BookingCalendar from '@/components/BookingCalendar'
import { useBookingCalendar } from '@/components/useBookingCalendar'

const AdvancedBookingPage = () => {
  const {
    selectedService,
    availableTimeSlots,
    isLoading,
    filteredServices,
    submitBooking
  } = useBookingCalendar({
    services: myServices,
    businessHours: {
      start: '09:00',
      end: '19:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
    }
  })

  return (
    <BookingCalendar
      services={filteredServices}
      availableTimeSlots={availableTimeSlots}
      isLoading={isLoading}
      onBookingSubmit={submitBooking}
    />
  )
}
```

## Props

### BookingCalendar Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `services` | `Service[]` | ✅ | - | Array of available spa services |
| `availableTimeSlots` | `TimeSlot[]` | ✅ | - | Array of available time slots |
| `onBookingSubmit` | `(data: BookingFormData) => Promise<void>` | ✅ | - | Callback for booking submission |
| `isLoading` | `boolean` | ❌ | `false` | Loading state for the calendar |
| `onDateChange` | `(date: Date) => void` | ❌ | - | Callback when date is selected |
| `onServiceChange` | `(serviceId: string) => void` | ❌ | - | Callback when service is selected |
| `className` | `string` | ❌ | `''` | Additional CSS classes |
| `minDate` | `Date` | ❌ | `new Date()` | Minimum selectable date |
| `maxDate` | `Date` | ❌ | `90 days from now` | Maximum selectable date |
| `businessHours` | `BusinessHours` | ❌ | Default hours | Business operating hours |

### Types

```typescript
interface Service {
  id: string
  name: string
  description: string
  duration: number // in minutes
  price: number
  category: 'massage' | 'facial' | 'body' | 'nail' | 'wellness'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface TimeSlot {
  start: string // ISO date string
  end: string // ISO date string
  available: boolean
  staffId?: string
  roomId?: string
}

interface BookingFormData {
  serviceId: string
  staffId?: string
  roomId?: string
  date: string
  time: string
  notes?: string
}
```

## Service Categories

The component supports five service categories, each with unique styling:

- **Massage** 🤍 - Heart icon, rose/pink gradient
- **Facial** ✨ - Sparkles icon, purple/lavender gradient  
- **Body** 🌿 - Leaf icon, green/emerald gradient
- **Nail** ⭐ - Star icon, amber/yellow gradient
- **Wellness** ✨ - Sparkles icon, blue/cyan gradient

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized through:

1. **Tailwind Config**: Extend the spa color palette in `tailwind.config.ts`
2. **CSS Variables**: Modify the CSS variables in `BookingCalendar.css`
3. **Custom Classes**: Add additional classes via the `className` prop

### Color Palette

```css
/* Spa Theme Colors */
--spa-primary: #0ea5e9;
--spa-primary-dark: #0284c7;
--spa-accent: #22c55e;
--spa-background: rgba(240, 249, 255, 0.7);
--spa-glass: rgba(255, 255, 255, 0.7);
```

### Business Hours

```tsx
const businessHours = {
  start: '09:00',
  end: '19:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
}
```

## Accessibility

The component is fully accessible with:

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Touch Targets**: Minimum 44px touch targets for mobile

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance

- **Lazy Loading**: Components load only when needed
- **Optimized Rendering**: Efficient re-renders with React.memo
- **Bundle Size**: Tree-shakeable imports
- **Memory Management**: Proper cleanup of event listeners

## Examples

See `/src/components/BookingCalendarExample.tsx` for a complete implementation example with:

- Service showcase
- Category filtering
- Error handling
- Loading states
- Success confirmations

## Contributing

When contributing to this component:

1. Maintain the spa aesthetic and luxury feel
2. Ensure accessibility standards are met
3. Add proper TypeScript types
4. Include responsive design considerations
5. Test across different screen sizes and devices

## License

This component is part of the luxury spa booking system and follows the same license terms.