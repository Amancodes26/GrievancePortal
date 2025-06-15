#App routing

grievance-frontend/
├── public/                             # Static files (logos, icons, PDFs)
├── src/
│   ├── app/                            # Next.js App Router layer
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing page or redirect
│   │   ├── grievance/
│   │   │   ├── page.tsx                # Student: Create/View grievances
│   │   │   └── [id]/                   # Dynamic route for grievance details
│   │   │       └── page.tsx            # Student/Admin: Grievance detail + timeline
│   │   └── admin/                      # Admin views
│   │       ├── branch/                 # Branch-level Admins
│   │       │   └── page.tsx            # Dashboard: grievances assigned to branch
│   │       ├── campus/                 # Campus-level Admins
│   │       │   └── page.tsx            # Dashboard: grievances assigned to campus
│   │       └── super/                  # Super Admins
│   │           └── page.tsx            # Dashboard: grievances assigned to super admin
│
│   ├── components/                     # Shared UI components
│   │   ├── GrievanceForm.tsx           # Reusable student form
│   │   ├── TimelineStepper.tsx         # Circle+tick timeline component
│   │   ├── StatusBadge.tsx             # Colored status (Pending, Resolved, etc.)
│   │   ├── PriorityTag.tsx             # Priority level visual (Low–Critical)
│   │   ├── AdminGrievanceTable.tsx     # Table for all admin views
│   │   └── Layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│
│   ├── hooks/                          # React Query/SWR + custom hooks
│   │   ├── useGrievances.ts
│   │   ├── useAuth.ts
│   │   └── useTimeline.ts
│
│   ├── services/                       # API call wrappers (axios/fetch)
│   │   ├── grievance.service.ts
│   │   ├── auth.service.ts
│   │   └── attachment.service.ts
│
│   ├── lib/                            # Helpers & utils
│   │   ├── constants.ts                # Status, priority, routes
│   │   ├── rbac.ts                     # Role guards
│   │   └── formatDate.ts
│
│   ├── context/                        # React Contexts (optional)
│   │   ├── AuthContext.tsx
│   │   └── RoleContext.tsx
│
│   ├── types/                          # Shared TypeScript types/interfaces
│   │   ├── grievance.d.ts
│   │   └── user.d.ts
│
│   ├── styles/
│   │   ├── globals.css                 # Tailwind base styles
│   │   └── theme.css                   # Optional custom themes
│
│   └── utils/
│       ├── fetcher.ts                  # Wrapper for SWR/React Query
│       └── withAuth.tsx                # Route protection (optional)
│
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
└── package.json

