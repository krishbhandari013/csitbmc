"use client";
// Consistent inline SVG icon set (stroke = currentColor). Always paired with a text label.

type P = { className?: string };

function base(className = "h-[18px] w-[18px]") {
  return {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
}

export const IconHome = ({ className }: P) => (<svg {...base(className)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg>);
export const IconPlus = ({ className }: P) => (<svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconBook = ({ className }: P) => (<svg {...base(className)}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 20.5V5.5" /><path d="M20 18v3H6.5" /></svg>);
export const IconUser = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const IconShield = ({ className }: P) => (<svg {...base(className)}><path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6Z" /><path d="m9.5 12 2 2 3.5-4" /></svg>);
export const IconArrowUp = ({ className }: P) => (<svg {...base(className)}><path d="M12 19V5m-6 6 6-6 6 6" /></svg>);
export const IconChat = ({ className }: P) => (<svg {...base(className)}><path d="M4 6h16v10H9l-5 4Z" /></svg>);
export const IconFlag = ({ className }: P) => (<svg {...base(className)}><path d="M6 21V4" /><path d="M6 4h12l-3 4 3 4H6" /></svg>);
export const IconCheck = ({ className }: P) => (<svg {...base(className)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconX = ({ className }: P) => (<svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconCalendar = ({ className }: P) => (<svg {...base(className)}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>);
export const IconClock = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconBack = ({ className }: P) => (<svg {...base(className)}><path d="M15 5l-7 7 7 7" /></svg>);
export const IconSearch = ({ className }: P) => (<svg {...base(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconLogout = ({ className }: P) => (<svg {...base(className)}><path d="M14 4H6v16h8" /><path d="M10 12h11m-3-3 3 3-3 3" /></svg>);
export const IconMenu = ({ className }: P) => (<svg {...base(className)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconEye = ({ className }: P) => (<svg {...base(className)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const IconEyeOff = ({ className }: P) => (<svg {...base(className)}><path d="M4 4l16 16" /><path d="M10 6c.7-.1 1.3-.2 2-.2 6.5 0 10 6.2 10 6.2a17 17 0 0 1-3 3.4M6 8A16 16 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.9" /></svg>);
export const IconInfo = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r="0.5" fill="currentColor" /></svg>);
export const IconAlert = ({ className }: P) => (<svg {...base(className)}><path d="M12 3 2.5 20h19Z" /><path d="M12 9v5" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></svg>);
export const IconUsers = ({ className }: P) => (<svg {...base(className)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 15.2c2 .7 3.4 2.3 4 4.8" /></svg>);
export const IconEdit = ({ className }: P) => (<svg {...base(className)}><path d="m14.5 5.5 4 4L8 20l-5 1 1-5Z" /></svg>);
export const IconRefresh = ({ className }: P) => (<svg {...base(className)}><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 3v4h-4" /></svg>);
export const IconMask = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" /><path d="M8.5 15.5c2-1.2 5-1.2 7 0" /></svg>);
export const IconDoc = ({ className }: P) => (<svg {...base(className)}><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v4h4" /></svg>);
