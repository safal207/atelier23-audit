# Visual Integrity 7.5

Scoped CSS cascade fix for the light brand-reference panel. Contrast checks use WCAG 2.2 AA 1.4.3 (4.5:1 for all text, including large text), keyboard focus visibility and 3:1 outline contrast. Negative control disables the new CSS. Pixel comparison of unaffected chapter, before/after panel screenshots, three browser engines and 320/390/1280 widths. Axe scans initial and expanded mobile state; report any remaining findings separately. Automated checks cannot certify full WCAG conformance. No new photos or claims. Main/deployment untouched.

Follow-up: axe detected the 40% legend label (#997747 on #fffdf8, 4.06:1). Darken to #79572c and gate on actual automated violations in initial and expanded states. Incomplete axe findings require manual review and do not constitute certification.
