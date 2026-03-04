# NAS Music Streaming - Design System

## 1. Overview
This document serves as the single source of truth for the design of the NAS Music Streaming service. The design philosophy centers on **Modern Minimalism**, **Content-First**, and **Glassmorphism** aesthetics, with a "Dark Mode First" approach.

---

## 2. Visual Identity

### 2.1 Color Palette

#### Primary Colors
*   **Primary Gradient**: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)` (Indigo to Violet)
*   **Primary Solid**: `#8b5cf6` (Violet-500)
*   **Accent**: `#f43f5e` (Rose-500) or `#f97316` (Orange-500) - Used for "Love" button, active states.

#### Neutral Colors (Dark Mode - Default)
*   **Background Main**: `#0f0f0f` (Deep Black)
*   **Background Surface**: `#1a1a1a` (Dark Gray) - Sidebar, Cards
*   **Background Elevate**: `#27272a` (Zinc-800) - Modals, Dropdowns
*   **Text Primary**: `#ffffff` (White)
*   **Text Secondary**: `#a1a1aa` (Zinc-400)
*   **Text Tertiary**: `#52525b` (Zinc-600)
*   **Border**: `rgba(255, 255, 255, 0.1)`

#### Neutral Colors (Light Mode)
*   **Background Main**: `#ffffff` (White)
*   **Background Surface**: `#f5f5f5` (Neutral-100)
*   **Text Primary**: `#18181b` (Zinc-900)
*   **Text Secondary**: `#71717a` (Zinc-500)

### 2.2 Typography
**Font Family**: `Inter`, system-ui, sans-serif.

| Style | Size (px/rem) | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | 32px / 2.0rem | Bold (700) | 1.2 | Page Titles |
| **H2** | 24px / 1.5rem | SemiBold (600) | 1.3 | Section Headers |
| **H3** | 20px / 1.25rem | Medium (500) | 1.4 | Card Titles |
| **Body L** | 16px / 1.0rem | Regular (400) | 1.5 | Main Text |
| **Body M** | 14px / 0.875rem | Regular (400) | 1.5 | Secondary Text, Lists |
| **Caption** | 12px / 0.75rem | Regular (400) | 1.4 | Metadata, Labels |

### 2.3 Effects (Glassmorphism)
Used for Player Bar, Modals, and Overlay Panels.

*   **Glass Default**:
    *   Background: `rgba(20, 20, 20, 0.7)` (Dark) / `rgba(255, 255, 255, 0.7)` (Light)
    *   Backdrop Filter: `blur(20px) saturate(180%)`
    *   Border: `1px solid rgba(255, 255, 255, 0.08)`
*   **Shadows**:
    *   Card Hover: `0 10px 30px -10px rgba(0, 0, 0, 0.5)`
    *   Floater: `0 20px 40px -10px rgba(0, 0, 0, 0.6)`

---

## 3. Layout System

### 3.1 Breakpoints
*   **Mobile**: 375px - 767px
*   **Tablet**: 768px - 1023px
*   **Desktop**: 1024px - 1439px
*   **Large Desktop**: 1440px - 1920px+

### 3.2 Desktop Layout (> 1024px)
A 3-column layout structure.

*   **Left Sidebar (Navigation)**:
    *   **Width**: Fixed `240px`
    *   **Position**: Fixed Left, Top to Bottom (minus Player height)
    *   **Content**: Logo, Navigation Links (Home, Songs, Albums, Artists, History, Settings), User Profile.
    *   **Style**: Surface Color (`#1a1a1a`), Border Right.

*   **Main Content Area**:
    *   **Width**: `calc(100vw - 240px - 300px)` (if Right Sidebar visible) OR `calc(100vw - 240px)`
    *   **Padding**: `32px`
    *   **Scroll**: Independent vertical scroll.

*   **Right Sidebar (Optional - Queue/Recommend)**:
    *   **Width**: Fixed `300px`
    *   **Position**: Fixed Right.
    *   **Visibility**: Toggleable.
    *   **Style**: Surface Color or Glassmorphism.

*   **Bottom Player Bar**:
    *   **Height**: Fixed `80px`
    *   **Width**: 100%
    *   **Position**: Fixed Bottom (`z-index: 50`)
    *   **Style**: Glassmorphism.
    *   **Content**: Current Song Info (Left), Controls (Center), Volume/Queue/Options (Right).

### 3.3 Mobile Layout (< 768px)
App-like interface with bottom navigation.

*   **Top Header**:
    *   **Height**: `56px`
    *   **Position**: Sticky Top.
    *   **Content**: Page Title (Center), Search Icon (Right), Menu/Back (Left).

*   **Main Content**:
    *   **Padding**: Top `56px`, Bottom `120px` (Player + TabBar).

*   **Bottom Player (Mini)**:
    *   **Height**: `64px`
    *   **Position**: Fixed Bottom (Above Tab Bar).
    *   **Interaction**: Tap to expand to **Full Screen Player**.
    *   **Content**: Cover (Thumbnail), Title, Play/Pause Button.

*   **Bottom Tab Bar**:
    *   **Height**: `56px` (plus safe area)
    *   **Position**: Fixed Bottom.
    *   **Content**: Home, Browse, History, My Library.

---

## 4. Component Specifications

### 4.1 Cards (Album/Playlist)
*   **Aspect Ratio**: 1:1 (Square Cover)
*   **Interaction**:
    *   **Hover**: Cover scales slightly (1.05), Play button overlay appears (Fade in + Slide up).
    *   **Click**: Navigate to detail page.
*   **Typography**: Title (Truncate 1 line), Subtitle (Truncate 1 line, Secondary Color).

### 4.2 Lists (Songs)
*   **Row Height**: `56px` (Desktop), `64px` (Mobile).
*   **Columns**:
    1.  Index / Play Icon (Hover)
    2.  Title (Primary Color)
    3.  Artist (Secondary Color)
    4.  Album (Hidden on Mobile)
    5.  Duration (Right Aligned)
    6.  Actions (Heart, More Menu) - Visible on Hover (Desktop).
*   **Interaction**: Double click to play. Right click for Context Menu.

### 4.3 Player Controls
*   **Play/Pause**: Primary Gradient Circle, 48px (Desktop) / 56px (Mobile Full).
*   **Skip Buttons**: Secondary Color, Hover to Primary.
*   **Progress Bar**:
    *   Height: `4px` (Inactive), `6px` (Hover/Dragging).
    *   Color: Primary Gradient.
    *   Rail: `rgba(255,255,255,0.1)`.

### 4.4 Inputs & Search
*   **Search Bar**:
    *   Background: `rgba(255,255,255,0.05)`.
    *   Border: None (Default) / Primary (Focus).
    *   Radius: `999px` (Pill shape).
    *   Icon: Left aligned.

---

## 5. Animations & Interaction
*   **Transitions**: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` (Smooth ease-out).
*   **Page Transition**: Fade in (`opacity: 0` -> `1`) + Slide up (`translateY(10px)` -> `0`).
*   **Skeleton Loading**: Pulse animation on gray blocks (`bg-zinc-800`).
*   **Gestures (Mobile)**:
    *   **Pull to Refresh**: Reload lists.
    *   **Swipe Up**: Expand Mini Player.
    *   **Swipe Down**: Minimize Full Player.
    *   **Swipe Left/Right**: Next/Prev Song (in Full Player).

---

## 6. Accessibility (A11y)
*   **Contrast**: Text must meet WCAG AA (4.5:1).
*   **Focus**: Visible focus ring (Primary Color, 2px offset) for keyboard navigation.
*   **ARIA**:
    *   `role="button"` for custom controls.
    *   `aria-label` for icon-only buttons (Play, Pause, Next).
    *   `aria-valuenow` for Progress/Volume sliders.
