# Responsive Design Fixes Checklist

## Global Architecture
- [x] **New Navigation System**:
  - Implemented `Sidebar` for Desktop/Tablet (collapsible).
  - Implemented `BottomNav` for Mobile.
  - Simplified `Navbar` to serve as a Mobile Header only.
  - Layout (`app/(dashboard)/layout.tsx`) adapts layout based on screen size (Sidebar on left, or Header+BottomNav).
- [x] **Global CSS**:
  - Added `.noscrollbar` utility for clean horizontal scrolling areas.
  - Verified safe-area insets padding (`pb-safe`).

## Crash Game (Aviator)
- [x] **Canvas Scaling**:
  - Changed fixed `h-80` to `aspect-video md:h-96` to preserve 16:9 ratio on mobile while allowing taller view on desktop.
- [x] **Text Scaling**:
  - Implemented dynamic font size in `CrashGraph` canvas (`Math.min(rect.width * 0.15, 60)`).
- [x] **Layout Flow**:
  - Mobile: Graph -> Stats -> Controls -> History (horizontal scroll).
  - Desktop: Grid layout with Graph (Left) + Controls (Right).
- [x] **Controls**:
  - Used `type="tel"` for inputs to trigger numeric keypad on mobile.
  - Added `touch-manipulation` to buttons.
  - Converted History list to a swipeable horizontal row on mobile to save vertical space.

## Color Prediction
- [x] **Timer Visibility**:
  - Adjusted font size to `text-5xl md:text-6xl` to prevent overflow on small screens (iPhone SE).
- [x] **Button Stacking**:
  - Verified default grid behavior stacks colored buttons vertically on mobile (`grid-cols-1`).
- [x] **History**:
  - Verified horizontal scrolling for result history balls.

## Mines Game
- [x] **Grid Adaptation**:
  - Updated grid container to `w-full max-w-[500px]` to ensure it uses available width on small screens while maintaining square aspect ratio.
- [x] **Touch Targets**:
  - Grid tiles scale with width, ensuring adequate touch area (>44px) on most devices.

## Performance & UX
- [x] **Inputs**:
  - Height set to `h-14` (56px) for easy thumb interaction.
- [x] **Scrollbars**:
  - Hidden native scrollbars in history sections for a cleaner "app-like" feel.
