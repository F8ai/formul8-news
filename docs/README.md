# Formul8 Cannabis News Feed

A static website that displays curated cannabis industry news, research, and policy updates from the Formul8 News Database.

## 🌐 Live Site

Once deployed to GitHub Pages, this site will be available at:
`https://[your-username].github.io/formul8-news/`

## 📊 Features

- **Real-time Feed**: Automatically fetches latest articles from Supabase public feed
- **Search & Filter**: Search articles by keyword and filter by type (news, patents, research)
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Topic Tags**: Articles tagged with relevant cannabis topics
- **Source Attribution**: Clear attribution to original sources
- **Live Stats**: Shows total articles, last update time, and number of sources

## 🚀 Setup GitHub Pages

1. **Push to GitHub**:
```bash
git add docs/
git commit -m "Add GitHub Pages site"
git push origin main
```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/docs`
   - Click "Save"

3. **Wait for deployment** (usually 1-2 minutes)

4. **Visit your site**: `https://[your-username].github.io/formul8-news/`

## 🔧 Configuration

The site fetches data from:
```
https://gptfmaceymhubyuhqegu.supabase.co/storage/v1/object/public/public-feeds/index.json
```

To change the feed URL, edit `FEED_URL` in `docs/index.html`.

## 📝 Feed Format

The site expects a JSON feed with this structure:

```json
{
  "title": "Formul8 Signals Feed",
  "description": "Curated news, patents, and scientific literature",
  "item_count": 100,
  "last_updated": "2026-03-05T19:00:00Z",
  "items": [
    {
      "id": "uuid",
      "type": "news",
      "title": "Article Title",
      "url": "https://...",
      "published_at": "2026-03-05T12:00:00Z",
      "content_snippet": "First 500 characters...",
      "source_name": "Source Name",
      "topics": ["topic1", "topic2"]
    }
  ]
}
```

## 🎨 Customization

### Colors
Edit the CSS gradient in `docs/index.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Branding
Update the header text and footer links in the HTML.

### Features
Add more filters, sorting options, or visualizations by modifying the JavaScript.

## 📱 Mobile Support

The site is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🔒 CORS & Security

The public feed is served from Supabase Storage with CORS enabled, allowing the static site to fetch data from any domain.

## 📈 Analytics (Optional)

To add Google Analytics:
1. Get your GA tracking ID
2. Add the GA script to `<head>` in `index.html`

## 🐛 Troubleshooting

**Feed not loading?**
- Check browser console for errors
- Verify the feed URL is accessible
- Ensure CORS is enabled on the Supabase bucket

**Articles not displaying?**
- Check the feed format matches expected structure
- Verify `items` array exists in the feed
- Check for JavaScript errors in console

## 📄 License

This site displays content from various sources. All articles are attributed to their original sources and comply with their respective license policies.
