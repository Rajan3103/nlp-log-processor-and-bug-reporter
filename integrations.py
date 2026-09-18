import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

# Global environment defaults
DEFAULT_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
DEFAULT_GITHUB_REPO = os.getenv("GITHUB_REPO", "") # Format: owner/repo
DEFAULT_DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL", "")
DEFAULT_SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")
DEFAULT_TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DEFAULT_TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
DEFAULT_JIRA_URL = os.getenv("JIRA_URL", "")
DEFAULT_JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
DEFAULT_JIRA_TOKEN = os.getenv("JIRA_API_TOKEN", "")
DEFAULT_JIRA_PROJECT = os.getenv("JIRA_PROJECT_KEY", "BUG")
DEFAULT_LINEAR_API_KEY = os.getenv("LINEAR_API_KEY", "")

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
**Occurrence Count:** `{report.get('occurrence_count', 1)}`

### 📝 Issue Description
{description}

### 💡 AI Suggested Fix / Solution
{solution if solution else "No fix suggested."}

---
*Reported automatically by **LogSentinel AI**.*
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
            {"name": "Occurrences", "value": f"`{report.get('occurrence_count', 1)}x`", "inline": True},
            {"name": "Source File", "value": report.get("source_file", "Unknown"), "inline": True},
            {"name": "AI Recommended Solution", "value": report.get("solution", "N/A")[:1000]}
        ],
        "footer": {"text": "LogSentinel AI Platform"}
    }

    payload = {"embeds": [embed]}
    res = requests.post(url, json=payload, timeout=10)
    if res.status_code in [200, 204]:
        return {"success": True}
    else:
        raise ValueError(f"Discord Webhook error ({res.status_code}): {res.text}")


def send_slack_webhook(report, webhook_url=None):
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
                    {"type": "mrkdwn", "text": f"*Occurrences:*\n`{report.get('occurrence_count', 1)}x`"},
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


def send_telegram_alert(report, bot_token=None, chat_id=None):
    token = bot_token or DEFAULT_TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN")
    chat = chat_id or DEFAULT_TELEGRAM_CHAT_ID or os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat:
        raise ValueError("Telegram Bot Token and Chat ID are required.")

    priority = report.get("priority", "Medium")
    category = report.get("category", "Application Bug")
    desc = report.get("description", "No description")
    solution = report.get("solution", "No fix available")
    source = report.get("source_file", "Unknown")

    message = f"""🚨 *[LOGSENTINEL BUG ALERT]* 🚨
*Priority:* `{priority}`
*Category:* `{category}`
*Source:* `{source}`
*Occurrences:* `{report.get('occurrence_count', 1)}x`

📝 *Description:*
{desc}

💡 *Gemini Fix Recommendation:*
{solution[:500]}
"""
    url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
    payload = {
        "chat_id": chat.strip(),
        "text": message,
        "parse_mode": "Markdown"
    }

    res = requests.post(url, json=payload, timeout=10)
    if res.status_code == 200:
        return {"success": True}
    else:
        raise ValueError(f"Telegram API error ({res.status_code}): {res.text}")


def create_jira_issue(report, jira_url=None, email=None, api_token=None, project_key=None):
    url = (jira_url or DEFAULT_JIRA_URL or os.getenv("JIRA_URL", "")).rstrip("/")
    user_email = email or DEFAULT_JIRA_EMAIL or os.getenv("JIRA_EMAIL")
    token = api_token or DEFAULT_JIRA_TOKEN or os.getenv("JIRA_API_TOKEN")
    proj = project_key or DEFAULT_JIRA_PROJECT or os.getenv("JIRA_PROJECT_KEY", "BUG")

    if not url or not user_email or not token:
        raise ValueError("Jira URL, User Email, and API Token are required.")

    endpoint = f"{url}/rest/api/3/issue"
    auth = (user_email.strip(), token.strip())
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    summary = f"[{report.get('priority', 'Medium')}] {report.get('category')}: {report.get('description', '')[:80]}"
    
    payload = {
        "fields": {
            "project": {"key": proj.strip()},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {"type": "text", "text": f"Description: {report.get('description')}\n\nAI Solution: {report.get('solution')}\nSource: {report.get('source_file')}"}
                        ]
                    }
                ]
            },
            "issuetype": {"name": "Bug"}
        }
    }

    res = requests.post(endpoint, json=payload, auth=auth, headers=headers, timeout=10)
    if res.status_code in [200, 201]:
        data = res.json()
        return {
            "success": True,
            "issue_key": data.get("key"),
            "issue_url": f"{url}/browse/{data.get('key')}"
        }
    else:
        raise ValueError(f"Jira API error ({res.status_code}): {res.text}")


def create_linear_issue(report, api_key=None, team_id=None):
    key = api_key or DEFAULT_LINEAR_API_KEY or os.getenv("LINEAR_API_KEY")
    if not key:
        raise ValueError("Linear API Key is required.")

    url = "https://api.linear.app/graphql"
    headers = {"Authorization": key.strip(), "Content-Type": "application/json"}
    
    priority_map = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}
    pri_val = priority_map.get(report.get("priority"), 3)

    mutation = """
    mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
            success
            issue {
                id
                identifier
                url
            }
        }
    }
    """
    title = f"[{report.get('priority', 'Medium')}] {report.get('category')}: {report.get('description', '')[:80]}"
    description = f"### Bug Report\n{report.get('description')}\n\n### Gemini Recommended Fix\n{report.get('solution')}\n\nSource File: `{report.get('source_file')}`"

    variables = {
        "input": {
            "title": title,
            "description": description,
            "priority": pri_val
        }
    }
    if team_id:
        variables["input"]["teamId"] = team_id

    res = requests.post(url, json={"query": mutation, "variables": variables}, headers=headers, timeout=10)
    data = res.json()
    if data.get("data", {}).get("issueCreate", {}).get("success"):
        issue = data["data"]["issueCreate"]["issue"]
        return {"success": True, "issue_url": issue.get("url"), "issue_number": issue.get("identifier")}
    else:
        errors = data.get("errors", [{"message": "Unknown Linear error"}])
        raise ValueError(f"Linear GraphQL error: {errors[0].get('message')}")
