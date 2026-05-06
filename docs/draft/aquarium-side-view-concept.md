# Aquarium Side View Concept

## Design Direction

- Viewpoint: front/side view based on `11260831.png`.
- Silhouette: flat rectangular rim, narrow neck, and oversized round lower fishbowl.
- Glass: pale blue outer body with large white highlights on the right side.
- Water: flat blue top water band plus a deeper teal rounded water mass inside the bowl.
- Interior: remove plant and pebble decorations so the bowl shape and water remain the main visual.
- Scale: bowl width should be 20% larger than the `960px` reference state, using `1152px`.

## App Mapping

- `DEFAULT_BOUNDS`: use `1152x780`.
- `.aquarium-bowl`: use a clipped jar silhouette with flat top, neck, shoulder, and round lower body.
- `.water-surface`: render the flat top water band inside the glass.
- `.swim-boundary`: render the large teal inner water mass with rounded bottom and depth highlights.
- Decorative elements: hide plant and pebble stack.
