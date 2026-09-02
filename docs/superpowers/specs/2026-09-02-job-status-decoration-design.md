# Job Status Decoration Design

Replace the visible status badge on each job card with a four-pixel leading border. The border uses the same status-specific palette as the board column's top border, including dark-theme variants.

Keep status in the existing accessible card name and preserve drag-and-drop, keyboard movement, click handling, card layout, and application data flow. Store column and card utility classes together in one typed status-style map so colors are defined once.
