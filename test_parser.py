import feedparser
from bs4 import BeautifulSoup
import json

URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_feed():
    feed = feedparser.parse(URL)
    print(f"Feed Title: {feed.feed.title}")
    print(f"Number of entries: {len(feed.entries)}")
    
    if len(feed.entries) > 0:
        first_entry = feed.entries[0]
        print(f"\n--- First Entry: {first_entry.title} ---")
        print(f"Updated: {first_entry.updated}")
        print(f"Link: {first_entry.link}")
        
        # HTML Content parsing
        content_html = first_entry.content[0].value
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # We want to extract individual updates. Let's see how headers and paragraphs are arranged.
        updates = []
        current_category = "General"
        current_html_blocks = []
        
        for element in soup.contents:
            # Skip empty strings
            if isinstance(element, str) and not element.strip():
                continue
                
            if element.name in ['h3', 'h4']:
                # Save previous update if exists
                if current_html_blocks:
                    updates.append({
                        "category": current_category,
                        "content": "".join(str(e) for e in current_html_blocks).strip()
                    })
                    current_html_blocks = []
                current_category = element.text.strip()
            else:
                current_html_blocks.append(element)
                
        # Append the last update
        if current_html_blocks:
            updates.append({
                "category": current_category,
                "content": "".join(str(e) for e in current_html_blocks).strip()
            })
            
        print(f"Found {len(updates)} individual updates in this entry:")
        for idx, u in enumerate(updates):
            print(f"\n[{idx + 1}] Category: {u['category']}")
            print(f"Content Sample: {u['content'][:150]}...")

if __name__ == "__main__":
    parse_feed()
