"""Test fixtures for Context Ambulance tests."""

from context_ambulance.analyzers import Message, MessageRole

# Sample conversation with loops
SAMPLE_LOOP_CONVERSATION = [
    Message(role=MessageRole.USER, content="How do I fix this Python error?\n\nNameError: name 'x' is not defined"),
    Message(role=MessageRole.ASSISTANT, content="You need to define x before using it. Try:\n```python\nx = 10\nprint(x)\n```"),
    Message(role=MessageRole.USER, content="Still getting the same error."),
    Message(role=MessageRole.ASSISTANT, content="I apologize. Let me try again:\n```python\nx = 10\nprint(x)\n```"),
    Message(role=MessageRole.USER, content="Same error."),
    Message(role=MessageRole.ASSISTANT, content="Sorry about that. Here's another approach:\n```python\nx = 10\nprint(x)\n```"),
    Message(role=MessageRole.USER, content="This isn't working."),
    Message(role=MessageRole.ASSISTANT, content="I apologize for the confusion. Let's try:\n```python\nx = 10\nprint(x)\n```"),
]

# Conversation with code churn
SAMPLE_CODE_CHURN = [
    Message(role=MessageRole.USER, content="Write a function to calculate factorial"),
    Message(role=MessageRole.ASSISTANT, content="```python\ndef factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n-1)\n```"),
    Message(role=MessageRole.USER, content="Add error handling"),
    Message(role=MessageRole.ASSISTANT, content="```python\ndef factorial(n):\n    if n < 0:\n        raise ValueError('Negative')\n    if n == 0:\n        return 1\n    return n * factorial(n-1)\n```"),
    Message(role=MessageRole.USER, content="Make it iterative"),
    Message(role=MessageRole.ASSISTANT, content="```python\ndef factorial(n):\n    result = 1\n    for i in range(1, n+1):\n        result *= i\n    return result\n```"),
    Message(role=MessageRole.USER, content="Add the error handling back"),
    Message(role=MessageRole.ASSISTANT, content="```python\ndef factorial(n):\n    if n < 0:\n        raise ValueError('Negative')\n    result = 1\n    for i in range(1, n+1):\n        result *= i\n    return result\n```"),
]

# Clean conversation (no loops)
SAMPLE_CLEAN_CONVERSATION = [
    Message(role=MessageRole.USER, content="How do I read a file in Python?"),
    Message(role=MessageRole.ASSISTANT, content="Use the open() function:\n```python\nwith open('file.txt', 'r') as f:\n    content = f.read()\nprint(content)\n```"),
    Message(role=MessageRole.USER, content="Thanks! That worked perfectly."),
]
