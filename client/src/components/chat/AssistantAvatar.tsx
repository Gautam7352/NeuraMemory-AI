export const AssistantAvatar = () => (
  <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-neutral-900 border border-neutral-700 mt-1 shadow-sm overflow-hidden">
    <svg
      width="20"
      height="20"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="7"
        y="7"
        width="24"
        height="24"
        rx="6"
        fill="#18181b"
        stroke="#38bdf8"
        strokeWidth="2"
      />
      <rect
        x="13"
        y="13"
        width="12"
        height="12"
        rx="3"
        fill="#a78bfa"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />
      <circle cx="13" cy="13" r="2" fill="#38bdf8" />
      <circle cx="25" cy="13" r="2" fill="#38bdf8" />
      <circle cx="13" cy="25" r="2" fill="#38bdf8" />
      <circle cx="25" cy="25" r="2" fill="#38bdf8" />
      <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
      <path
        d="M19 7V11"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M19 27V31"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 19H11"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M27 19H31"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);
