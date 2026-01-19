# BetX Design System - Quick Reference

## 🎨 Color Palette

### Primary Colors
```css
--primary-gradient: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%);
--accent-gradient: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
--dark-gradient: linear-gradient(180deg, #18181b 0%, #09090b 100%);
```

### Tailwind Colors
- **Primary**: `primary-400`, `primary-500`, `primary-600` (Blue shades)
- **Accent**: `green-400`, `green-500` (Success/Win)
- **Warning**: `yellow-400`, `yellow-500` (Highlights)
- **Error**: `red-400`, `red-500` (Losses/Errors)
- **Purple**: `purple-400`, `purple-600` (Secondary accent)

### Background Colors
- **Main BG**: `bg-[#0a0a0f]`
- **Card BG**: `bg-zinc-900/80`
- **Hover BG**: `bg-zinc-900`
- **Border**: `border-white/5`

## 🧩 Utility Classes

### Glassmorphism
```tsx
className="glass"          // Light glass effect
className="glass-dark"     // Dark glass effect
```

### Gradients
```tsx
className="bg-primary-gradient"  // Blue → Purple
className="bg-accent-gradient"   // Green → Blue
className="bg-casino-gradient"   // Dark gradient overlay
```

### Shadows & Glows
```tsx
className="shadow-glow-primary"  // Blue glow
className="shadow-glow-accent"   // Green glow
```

### Animations
```tsx
className="animate-shimmer"    // Loading shimmer effect
className="animate-slide-up"   // Slide up from bottom
className="animate-ticker"     // Infinite horizontal scroll
```

## 📐 Spacing & Sizing

### Border Radius
- **Cards**: `rounded-2xl` (16px)
- **Buttons**: `rounded-xl` (12px)
- **Badges**: `rounded-full`
- **Icons**: `rounded-lg` (8px)

### Padding
- **Cards**: `p-4` (mobile), `p-6` (desktop)
- **Sections**: `px-4 py-6` (mobile), `px-6 py-12` (desktop)
- **Buttons**: `px-4 py-2.5` (mobile), `px-6 py-3` (desktop)

### Gaps
- **Grid**: `gap-4` (mobile), `gap-6` (desktop)
- **Flex**: `gap-2` (tight), `gap-3` (normal), `gap-4` (loose)

## 🔤 Typography

### Font Families
```tsx
font-family: 'Inter', sans-serif;        // Body text
font-family: 'Poppins', sans-serif;      // Headings (optional)
```

### Font Weights
- **Regular**: `font-normal` (400)
- **Medium**: `font-medium` (500)
- **Semibold**: `font-semibold` (600)
- **Bold**: `font-bold` (700)
- **Black**: `font-black` (900) - Use for headings

### Font Sizes
- **Headings**: `text-2xl` (mobile), `text-3xl` (desktop)
- **Subheadings**: `text-lg` (mobile), `text-xl` (desktop)
- **Body**: `text-sm` (mobile), `text-base` (desktop)
- **Labels**: `text-xs` (10-12px)
- **Tiny**: `text-[10px]` (custom)

## 🎭 Component Patterns

### Button Styles
```tsx
// Primary CTA
className="px-6 py-3 bg-primary-gradient rounded-xl font-bold text-white shadow-glow-primary hover:scale-105 transition-transform"

// Secondary Button
className="px-6 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 rounded-xl font-bold transition-all"

// Disabled Button
className="px-6 py-3 bg-zinc-800/50 text-zinc-600 rounded-xl font-bold cursor-not-allowed"
```

### Card Styles
```tsx
// Game Card
className="glass-dark rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all hover:shadow-2xl"

// Stat Card
className="glass-dark p-4 rounded-xl border border-white/5 hover:border-primary-500/20"

// Feature Card
className="glass-dark p-6 rounded-2xl border border-white/5 hover:-translate-y-1 transition-all"
```

### Badge Styles
```tsx
// Live Badge
className="glass px-2.5 py-1 rounded-full flex items-center gap-1.5"

// Status Badge
className="bg-zinc-900/50 px-3 py-1 rounded-full text-xs font-bold uppercase"
```

## 📱 Responsive Breakpoints

```tsx
// Mobile First
className="text-sm md:text-base lg:text-lg"

// Grid Responsive
className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"

// Hide/Show
className="hidden md:block"    // Desktop only
className="md:hidden"          // Mobile only
```

## 🎬 Framer Motion Patterns

### Hover Animation
```tsx
<motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
```

### Layout Animation
```tsx
<motion.div layoutId="uniqueId" transition={{ type: 'spring', bounce: 0.2 }}>
```

### Enter/Exit Animation
```tsx
<AnimatePresence>
  <motion.div
    initial={{ opacity: 0, x: 100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 100 }}
  />
</AnimatePresence>
```

## 🔧 Common Combinations

### Premium Heading
```tsx
<h2 className="text-2xl md:text-3xl font-black text-white mb-2">
  Title
</h2>
```

### Subtitle
```tsx
<p className="text-sm text-zinc-400 leading-relaxed">
  Description text
</p>
```

### Icon Container
```tsx
<div className="p-2 bg-zinc-900/50 rounded-lg">
  <Icon className="w-5 h-5 text-primary-400" />
</div>
```

### Glow Button
```tsx
<button className="px-6 py-3 bg-primary-gradient rounded-xl font-bold text-white shadow-glow-primary hover:scale-105 active:scale-95 transition-all">
  Click Me
</button>
```

## 🎯 Best Practices

1. **Always use mobile-first approach**: Start with mobile styles, add `md:` and `lg:` prefixes for larger screens
2. **Prefer `font-black` for headings**: Creates strong visual hierarchy
3. **Use `text-zinc-400` for secondary text**: Better readability than pure gray
4. **Add `transition-all` for smooth interactions**: Makes UI feel polished
5. **Use `hover:scale-105` sparingly**: Only on CTAs and important buttons
6. **Combine `glass-dark` with `border-white/5`**: Creates depth
7. **Use `shadow-glow-*` on primary CTAs**: Draws attention
8. **Keep animations under 300ms**: Feels instant, not sluggish
9. **Use `truncate` for long text**: Prevents layout breaks
10. **Add `active:scale-95` to buttons**: Provides tactile feedback

## 📦 Component Template

```tsx
'use client'

import { motion } from 'framer-motion'
import { Icon } from 'lucide-react'

interface ComponentProps {
  title: string
  description: string
}

const Component = ({ title, description }: ComponentProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-dark p-6 rounded-2xl border border-white/5 hover:border-primary-500/20 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-zinc-900/50 rounded-lg">
          <Icon className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  )
}

export default Component
```

---

**Last Updated**: January 19, 2026
**Version**: 1.0.0
