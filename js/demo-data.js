/* ═══════════════════════════════════════════════
   Demo HTML — Intentionally Bad SEO
   Triggers all 11 rule checks for demonstration
   ═══════════════════════════════════════════════ */
const DEMO_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <!-- No title tag! -->
  <!-- No meta description! -->
  <!-- No canonical! -->
  <!-- No Open Graph tags! -->
  <!-- No Twitter Card! -->
  <!-- No structured data / schema! -->
</head>
<body>
  <!-- No H1 tag! Starts with H3 directly (broken hierarchy) -->
  <h3>Welcome to Our Amazing Online Store</h3>
  <h5>Shop the Best Products Available Online Today</h5>

  <p>We sell great products. Buy now. Best deals available.</p>

  <!-- Images with no alt text -->
  <img src="images/product1.jpg">
  <img src="images/product2.jpg">
  <img src="images/hero-banner.jpg">

  <a href="/about">About Us</a>
  <a href="/contact">Contact</a>
  <a href="/products">Products</a>

  <!-- Thin content — well under 300 words total -->
</body>
</html>`;
