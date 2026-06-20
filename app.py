import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_content(content_html):
    """
    Parses the HTML contents of an Atom feed entry and groups them
    into distinct updates based on <h3> or <h4> headers.
    """
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_category = "General"
    current_blocks = []
    
    # Iterate through high-level elements in the HTML
    for element in soup.contents:
        if isinstance(element, str) and not element.strip():
            continue
            
        if element.name in ['h3', 'h4']:
            # Save the previous block if it has content
            if current_blocks:
                html_str = "".join(str(e) for e in current_blocks).strip()
                block_soup = BeautifulSoup(html_str, 'html.parser')
                text_str = block_soup.get_text(separator=' ').strip()
                
                updates.append({
                    "category": current_category,
                    "html_content": html_str,
                    "text_content": text_str
                })
                current_blocks = []
            current_category = element.text.strip()
        else:
            current_blocks.append(element)
            
    # Save the final block
    if current_blocks:
        html_str = "".join(str(e) for e in current_blocks).strip()
        block_soup = BeautifulSoup(html_str, 'html.parser')
        text_str = block_soup.get_text(separator=' ').strip()
        
        updates.append({
            "category": current_category,
            "html_content": html_str,
            "text_content": text_str
        })
        
    # Fallback if no structured sections were parsed
    if not updates and soup.text.strip():
        updates.append({
            "category": "General",
            "html_content": str(soup),
            "text_content": soup.get_text(separator=' ').strip()
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch RSS Feed with a timeout
        response = requests.get(FEED_URL, timeout=12)
        response.raise_for_status()
        
        # Parse XML feed
        feed = feedparser.parse(response.content)
        
        if feed.bozo:
            # Bozo is set to 1 if the feed is not well-formed XML, but feedparser may still parse it.
            # We can log it, but we only fail if no entries are parsed.
            pass
            
        parsed_data = {
            "title": feed.feed.get("title", "BigQuery - Release notes"),
            "updated": feed.feed.get("updated", ""),
            "entries": []
        }
        
        for entry in feed.entries:
            content_html = ""
            if "content" in entry and len(entry.content) > 0:
                content_html = entry.content[0].value
            elif "summary" in entry:
                content_html = entry.summary
                
            updates = parse_entry_content(content_html)
            
            # Find the ID anchor if possible (e.g. tag:google.com,2016:bigquery-release-notes#June_17_2026)
            entry_id = entry.get("id", "")
            anchor = ""
            if "#" in entry_id:
                anchor = entry_id.split("#")[-1]
            elif "#" in entry.get("link", ""):
                anchor = entry.get("link", "").split("#")[-1]
            
            parsed_data["entries"].append({
                "id": entry_id,
                "title": entry.get("title", "Unknown Date"),
                "link": entry.get("link", ""),
                "anchor": anchor,
                "updated": entry.get("updated", ""),
                "updates": updates
            })
            
        return jsonify(parsed_data)
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error fetching feed: {str(e)}"}), 503
    except Exception as e:
        return jsonify({"error": f"Failed to parse release notes: {str(e)}"}), 500

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
