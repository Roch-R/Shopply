export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  img: string;
  author: string;
  readTime: string;
  excerpt: string;
  content: string; // HTML or Markdown content
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'announcing-shopply-v2',
    title: 'Announcing Shopply v2.0: A New Era for E-commerce',
    date: 'May 23, 2026',
    img: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    author: 'Alex Carter',
    readTime: '5 min read',
    excerpt: 'Read the full story to learn more about what this means for your business on Shopply...',
    content: `
      <h2>The Next Generation of Commerce</h2>
      <p>Today, we are beyond thrilled to announce <strong>Shopply v2.0</strong> — the most significant update in our company's history. Over the last year, our team has completely reimagined what an e-commerce platform should feel like for modern creators.</p>
      
      <p>We've completely rewritten our core engine, resulting in page loads that are up to <strong>300% faster</strong>. But we didn't stop there.</p>
      
      <h3>What's New in v2.0?</h3>
      <ul>
        <li><strong>A Re-engineered Dashboard:</strong> Navigate your business with a stunning, intuitive new interface.</li>
        <li><strong>Instant Storefronts:</strong> Launch a beautiful shop with zero coding experience in under 60 seconds.</li>
        <li><strong>Advanced Analytics:</strong> See exactly where your customers are coming from and what they are buying.</li>
      </ul>
      
      <p>We believe that anyone should be able to turn their passion into a thriving business, and Shopply v2.0 is our biggest leap forward in making that a reality. We can't wait to see what you build.</p>
    `
  },
  {
    slug: 'how-jane-doe-made-10k',
    title: 'How Jane Doe Made $10k in Her First Month',
    date: 'May 15, 2026',
    img: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    author: 'Sarah Jenkins',
    readTime: '8 min read',
    excerpt: 'Read the full story to learn more about what this means for your business on Shopply...',
    content: `
      <h2>From Passion to Profit</h2>
      <p>When Jane Doe signed up for Shopply, she had a simple goal: sell a few of her handmade ceramic mugs to friends and family. Thirty days later, her store had generated over $10,000 in revenue.</p>
      
      <p>We sat down with Jane to discuss her phenomenal growth and exactly how she leveraged the Shopply platform to scale so quickly.</p>
      
      <h3>1. Nailing the Niche</h3>
      <p>"I knew that generic coffee mugs wouldn't sell," Jane explains. "I focused entirely on custom, personalized pet portraits on ceramics. People love their pets, and giving them something tangible and beautifully crafted made all the difference."</p>
      
      <h3>2. Leveraging Shopply's Social Tools</h3>
      <p>Jane didn't spend a single dollar on traditional advertising. Instead, she used Shopply's built-in Instagram integration to tag her products directly in her reels. "The checkout process on Shopply is so seamless that when people saw a mug they liked on Instagram, they were checking out 15 seconds later."</p>
      
      <h3>3. The Power of the Abandoned Cart</h3>
      <p>"Shopply's automated abandoned cart emails recovered almost $2,000 in sales that I would have otherwise lost," she notes.</p>
      
      <p>Jane's story is a testament to the fact that with the right product and the right platform, massive success is just around the corner.</p>
    `
  },
  {
    slug: 'future-of-social-commerce',
    title: 'The Future of Social Commerce',
    date: 'May 02, 2026',
    img: 'linear-gradient(135deg, #10b981, #3b82f6)',
    author: 'David Chen',
    readTime: '6 min read',
    excerpt: 'Read the full story to learn more about what this means for your business on Shopply...',
    content: `
      <h2>The Shift in Consumer Behavior</h2>
      <p>The traditional e-commerce funnel is dying. Consumers no longer want to click an ad, browse a clunky catalog, and fill out a five-page checkout form. They want to see a product in their feed, tap it, and buy it instantly.</p>
      
      <p>This is the era of <strong>Social Commerce</strong>, and it is fundamentally changing how we buy and sell online.</p>
      
      <h3>The Rise of In-Feed Purchasing</h3>
      <p>Platforms are increasingly closing the loop. By integrating the checkout experience directly into the social feed, the friction of buying drops to nearly zero. This leads to higher conversion rates, especially for impulse purchases and lifestyle products.</p>
      
      <h3>How Shopply is Leading the Charge</h3>
      <p>At Shopply, we've built our infrastructure to be completely headless and embeddable. Our new <em>Shopply Social SDK</em> allows merchants to embed their entire store experience into any app, widget, or social platform seamlessly.</p>
      
      <p>The brands that win the next decade won't just have the best products; they'll have the most frictionless buying experiences.</p>
    `
  }
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}
