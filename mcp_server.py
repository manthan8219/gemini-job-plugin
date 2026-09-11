# mcp_server.py
# Prerequisite: pip install mcp
from mcp.server.fastmcp import FastMCP

# Initialize the MCP Server
mcp = FastMCP("JobAssistantDB")

@mcp.tool()
def save_user_profile(first_name: str, last_name: str, email: str) -> str:
    """
    Saves the user's profile information to the online database.
    """
    # TODO: Replace this with your actual database code (e.g., Supabase, Firebase, Postgres)
    print(f"[Database Log] Saving user: {first_name} {last_name} ({email})")
    
    # Simulate a successful save
    return f"Successfully registered {first_name} {last_name} in the online database!"

if __name__ == "__main__":
    # Runs the server over standard input/output (stdio) so Antigravity can communicate with it
    mcp.run()
