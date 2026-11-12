# Design reference

`landing-reference.dc.html` is the approved landing page design, exported from the design tool.
It is the visual and copy specification (colours, sizes, spacing, wording, section order, inline
SVGs). It is not app code: do not import it or ship it.

Notes on the reference file:

- `{{accent}}` is a placeholder for the brand blue `#0A5F96`.
- The image URLs are placeholders. They map to the photos the site uses, all in `public/images/`:
  - `/_blob/2830a053b75ef294c6d75f082ee069cc` -> `public/images/calf.jpg` (hero)
  - `/_blob/9f8d1cd9f91879b3795495d158972268` -> `public/images/testimonials-cows.jpg`
  - `/_blob/296617d41dd75c8450adb4f8b5b78713` -> `public/images/cta-cows-feeding.jpg`
- Ignore the `<x-dc>`, `<helmet>` and `<script type="text/x-dc">` wrappers and `support.js`.
  They belong to the design tool, not to the page.
