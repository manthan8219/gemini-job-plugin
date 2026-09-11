---
name: user-creation
description: Handles the creation of a new user using the create-user tool if the user is not yet registered.
---

# User Creation Skill

Use this skill to create a new user profile when they are not registered in the system.

## Model Usage
This is a lightweight task. To save resources and reduce latency, you should execute this skill by delegating it to a subagent with the `Model` argument set to `flash` or `flash_lite`.

## Workflow Overview

1. Ask the user for their basic details required for registration (if not already known from the conversation or context).
2. Call the `create-user` tool with the required information to create the user profile.
3. Confirm successful user creation with the user.
4. Transition back to the onboarding process to ensure the user completes their profile setup.
