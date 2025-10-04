# Design System & Component Standards

## Overview
This document defines the standardized design system for Algo Trader Pro to ensure consistency across all components.

## Global Styles
All global component styles are defined in `src/styles.scss`. Components should use these standard classes rather than creating custom styles.

## Core Components

### 1. Form Controls

#### Control Group (`.control-group`)
Standard wrapper for form fields with label and input.

```html
<div class="control-group">
  <label>Label Text</label>
  <input type="text" placeholder="Enter value" />
</div>
```

**Features:**
- Consistent spacing (6px gap, 16px bottom margin)
- Standardized label styling (0.875rem, 600 weight, secondary color)
- Input padding: 10px 12px
- Border radius: 6px
- Focus state with accent color and subtle shadow
- Error state support

#### Selects & Textareas
Use same `.control-group` wrapper. Textareas have automatic vertical resize.

### 2. Buttons

#### Base Button (`.btn`)
All buttons should use the `.btn` class as base.

```html
<button class="btn btn-primary">Action</button>
```

**Available Variants:**
- `.btn-primary` - Primary actions (blue)
- `.btn-success` - Success actions (green)
- `.btn-danger` - Destructive actions (red)
- `.btn-warning` - Warning actions (yellow)
- `.btn-secondary` - Secondary actions (gray)
- `.btn-outline` - Outline style

**Size Modifiers:**
- `.btn-sm` - Small button (6px 12px padding)
- `.btn-lg` - Large button (12px 24px padding)
- `.btn-block` - Full width button

**Features:**
- Hover lift effect (translateY(-1px))
- Disabled state with 0.6 opacity
- Smooth transitions
- Consistent hover shadows

### 3. Cards & Panels

#### Card (`.card`)
Container for content sections.

```html
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    Content here
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

#### Panel (`.panel`)
Similar to card but with different background color for nested sections.

```html
<div class="panel">
  <div class="panel-header">
    <h2>Panel Title</h2>
    <p>Description text</p>
  </div>
  Panel content
</div>
```

### 4. Controls Panel
Standardized filter/action bar for controls.

```html
<div class="controls-panel">
  <div class="control-group">
    <label>Filter</label>
    <select>...</select>
  </div>
  <button class="btn btn-primary">Action</button>
</div>
```

**Features:**
- Flex layout with wrapping
- 12px gap between items
- Tertiary background
- Items align to flex-end

### 5. Tables

#### Table Container (`.table-container`)
Wrapper for scrollable tables.

```html
<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Features:**
- Sticky header
- Hover row highlighting
- Custom scrollbar styling
- Responsive overflow

**Row Modifiers:**
- `.active` - Active row (blue tint)
- `.success` - Success row (green tint)
- `.danger` - Danger row (red tint)

**Cell Modifiers:**
- `.positive` - Green text (for profits)
- `.negative` - Red text (for losses)

### 6. Metric Cards

```html
<div class="metric-card">
  <div class="metric-label">Total Profit</div>
  <div class="metric-value positive">
    $1,234.56
    <small>+12.5%</small>
  </div>
</div>
```

### 7. Badges

```html
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Failed</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-info">Info</span>
```

### 8. Progress Bar

```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 65%"></div>
</div>
```

## Utility Classes

### Text Colors
- `.text-primary` - Primary text color
- `.text-secondary` - Secondary text color
- `.text-tertiary` - Tertiary text color
- `.text-success` - Green text
- `.text-danger` - Red text
- `.text-warning` - Yellow text
- `.text-info` - Blue text

### Background Colors
- `.bg-primary` - Primary background
- `.bg-secondary` - Secondary background
- `.bg-tertiary` - Tertiary background

### Spacing
**Margin:**
- `.mt-0` to `.mt-4` - Margin top (0, 8px, 16px, 24px, 32px)
- `.mb-0` to `.mb-4` - Margin bottom

**Padding:**
- `.p-0` to `.p-4` - Padding all sides

### Flexbox
- `.d-flex` - Display flex
- `.flex-column` - Flex direction column
- `.flex-wrap` - Flex wrap
- `.align-center` - Align items center
- `.justify-center` - Justify content center
- `.justify-between` - Justify content space-between
- `.gap-1` to `.gap-3` - Gap (8px, 16px, 24px)

## CSS Variables

### Colors
```scss
--bg-primary: #2a2d35
--bg-secondary: #1e2128
--bg-tertiary: #363a45
--bg-hover: #3a3e4a

--text-primary: #e8e9ed
--text-secondary: #b8bcc8
--text-tertiary: #8b8f9c

--border-primary: #404452
--border-secondary: #4f5463

--accent-primary: #60a5fa
--accent-secondary: #3b82f6

--success: #22c55e
--danger: #f87171
--warning: #fbbf24
--info: #60a5fa

--buy-green: #22c55e
--sell-red: #f87171
```

## Implementation Guidelines

### DO:
✅ Use global classes from `styles.scss`
✅ Combine classes for variations (e.g., `btn btn-primary btn-sm`)
✅ Use CSS variables for colors
✅ Follow the mobile-first responsive approach
✅ Maintain consistent spacing (multiples of 4px or 8px)

### DON'T:
❌ Create duplicate button/input styles in component SCSS
❌ Use hardcoded colors - always use CSS variables
❌ Create inconsistent spacing
❌ Override global styles without good reason
❌ Use inline styles for layout/design

## Migration Checklist

When updating a component to use the design system:

1. ✅ Replace custom buttons with `.btn` + modifier classes
2. ✅ Replace custom inputs with `.control-group` wrapper
3. ✅ Replace custom cards/panels with `.card` or `.panel`
4. ✅ Replace custom tables with `.table-container` + `.table`
5. ✅ Use utility classes for spacing/layout
6. ✅ Remove duplicate CSS that matches global styles
7. ✅ Test responsive behavior on mobile/tablet/desktop

## Component-Specific Notes

### Backtesting Component
- ✅ Updated to use global controls and buttons
- ✅ Uses `.panel` for optimization section
- ✅ Uses `.table-container` + `.table` for results
- ✅ Maintains custom gradient for optimize button
- ✅ Mobile responsive with proper breakpoints

### Future Updates Needed
- Dashboard component
- Strategy Manager
- Order Placement
- Other form-heavy components

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

All components should be mobile-first and properly tested across breakpoints.
