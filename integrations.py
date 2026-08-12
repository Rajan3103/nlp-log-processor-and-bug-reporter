import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

# Global environment defaults
DEFAULT_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
DEFAULT_GITHUB_REPO = os.getenv("GITHUB_REPO", "") # Format: owner/repo
DEFAULT_DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL", "")
DEFAULT_SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")

PRIORITY_COLOR_DISCORD = {
    "Critical": 15158332, # Red
    "High": 16027648,     # Orange
    "Medium": 16107531,   # Yellow
    "Low": 3066993,       # Green
}

def create_github_issue(report, token=None, repo=None):
    """
    Creates an issue on GitHub for the given bug report.
    repo format: 'owner/repo'
    """
    github_token = token or DEFAULT_GITHUB_TOKEN or os.getenv("GITHUB_TOKEN")
    github_repo = repo or DEFAULT_GITHUB_REPO or os.getenv("GITHUB_REPO")

    if not github_token:
        raise ValueError("GitHub Token is required. Please provide it or set GITHUB_TOKEN in your environment.")
    if not github_repo or "/" not in github_repo:
        raise ValueError("Target repository is required in 'owner/repo' format (e.g. 'octocat/Hello-World').")

    url = f"https://api.github.com/repos/{github_repo.strip()}/issues"
    
    headers = {
        "Authorization": f"Bearer {github_token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    priority = report.get("priority", "Medium")
    category = report.get("category", "Application Bug")
    description = report.get("description", "No description provided.")
    solution = report.get("solution", "N/A")
    source_file = report.get("source_file", "Unknown")

    title = f"[{priority.upper()}] {category}: {description[:70]}"
    if len(description) > 70:
        title += "..."

    body = f"""## 🔍 Bug Report: {category}

**Priority:** `{priority}`  
**Source File:** `{source_file}`  
**Timestamp:** `{report.get('timestamp', 'N/A')}`  

### 📝 Issue Description
{description}

### 💡 AI Suggested Fix / Solution
{solution if solution else "No fix suggested."}

---
*Reported automatically by **Bug Identifier (Nexus NLP Pipeline)**.*
"""

    labels = ["bug", f"priority:{priority.lower()}", f"category:{category.lower().replace(' ', '-')}"]

    payload = {
        "title": title,
        "body": body,
        "labels": labels
    }

    res = requests.post(url, headers=headers, json=payload, timeout=10)
    
    if res.status_code == 201:
        issue_data = res.json()
        return {
            "success": True,
            "issue_url": issue_data.get("html_url"),
            "issue_number": issue_data.get("number")
        }
    else:
        error_msg = res.json().get("message", res.text)
        raise ValueError(f"GitHub API Error ({res.status_code}): {error_msg}")


def send_discord_webhook(report, webhook_url=None):
    """
    Sends a rich formatted embed notification to Discord.
    """
    url = webhook_url or DEFAULT_DISCORD_WEBHOOK or os.getenv("DISCORD_WEBHOOK_URL")
    if not url:
        raise ValueError("Discord Webhook URL is not configured.")

    priority = report.get("priority", "Medium")
    color = PRIORITY_COLOR_DISCORD.get(priority, 3447003)

    embed = {
        "title": f"🚨 Bug Detected: {report.get('category', 'Issue')}",
        "description": report.get("description", "No description"),
        "color": color,
        "fields": [
            {"name": "Priority", "value": f"`{priority}`", "inline": True},
            {"name": "Category", "value": report.get("category", "General"), "inline": True},
            {"name": "Source File", "value": report.get("source_file", "Unknown"), "inline": True},
            {"name": "AI Recommended Solution", "value": report.get("solution", "N/A")[:1000]}
        ],
        "footer": {"text": "Bug Identifier • Nexus NLP Pipeline"}
    }

    payload = {"embeds": [embed]}
    res = requests.post(url, json=payload, timeout=10)
    if res.status_code in [200, 204]:
        return {"success": True}
    else:
        raise ValueError(f"Discord Webhook error ({res.status_code}): {res.text}")


def send_slack_webhook(report, webhook_url=None):
    """
    Sends a formatted Block Kit notification to Slack.
    """
    url = webhook_url or DEFAULT_SLACK_WEBHOOK or os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        raise ValueError("Slack Webhook URL is not configured.")

    priority = report.get("priority", "Medium")
    
    payload = {
        "text": f"🚨 *Bug Report Alert [{priority}]*: {report.get('description', '')[:100]}",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🚨 Bug Detected: {report.get('category', 'Issue')}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Priority:*\n`{priority}`"},
                    {"type": "mrkdwn", "text": f"*Source File:*\n`{report.get('source_file', 'N/A')}`"}
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Description:*\n{report.get('description', '')}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*AI Suggested Solution:*\n{report.get('solution', 'N/A')}"
                }
            }
        ]
    }

    res = requests.post(url, json=payload, timeout=10)
    if res.status_code == 200:
        return {"success": True}
    else:
        raise ValueError(f"Slack Webhook error ({res.status_code}): {res.text}")
