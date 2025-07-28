# Luxury Spa Booking System

A modern, full-stack spa booking application built with Next.js, TypeScript, and Supabase. This application provides a seamless booking experience for luxury spa services with real-time availability management.

## 🚀 Features

- **Modern UI/UX**: Beautiful, responsive design with smooth animations
- **Real-time Availability**: Live time slot availability with instant updates
- **Service Management**: Comprehensive service catalog with categories
- **Booking System**: Advanced booking with room and staff assignment
- **Admin Dashboard**: Staff scheduling and booking management
- **Database Integration**: Full Supabase integration with PostgreSQL
- **Type Safety**: Complete TypeScript coverage
- **Performance Optimized**: Caching, lazy loading, and optimized queries

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Ayy-man/spa-booking-v1.git
cd spa-booking-v1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the database migrations:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your_project_ref

# Run migrations
supabase db push
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
medspav1/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   │   ├── BookingCalendar.tsx
│   │   ├── BookingCalendarExample.tsx
│   │   ├── TimeSlotPicker.tsx
│   │   └── useBookingCalendar.ts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── supabase.ts     # Server-side Supabase
│   │   ├── supabase-client.ts # Client-side Supabase
│   │   └── availability.ts # Availability logic
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── supabase/               # Database migrations and schema
├── public/                 # Static assets
└── package.json
```

## 🎯 Key Components

### BookingCalendar
The main booking interface component that handles:
- Service selection
- Date picking
- Time slot selection
- Booking confirmation

### Availability System
Real-time availability management with:
- Date availability summaries
- Time slot generation
- Conflict detection
- Caching for performance

### Database Schema
Comprehensive database design including:
- Users (customers, staff, admin)
- Services with room restrictions
- Rooms with capacity tracking
- Staff scheduling
- Booking management with audit trails

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Ayy-man/spa-booking-v1/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🎉 Acknowledgments

- Built with Next.js and Supabase
- UI components styled with Tailwind CSS
- Animations powered by Framer Motion
- Icons from Lucide React

---

**Happy Booking! 🧖‍♀️✨**