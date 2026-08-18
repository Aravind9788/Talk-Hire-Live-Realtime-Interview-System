"""Question catalog and selection logic for TalkHire interview agent."""

from __future__ import annotations

import random
from typing import Any
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.questions")

_QUESTIONS: dict[str, list[str]] = {
    "behavioural": [
        "Tell me about a time you had a significant disagreement with your manager. How did you handle it?",
        "Describe a project where you had to deliver under an extremely tight deadline. What trade-offs did you make?",
        "Give me an example of a time you influenced a team decision without having direct authority.",
        "Tell me about the most technically complex problem you have solved. Walk me through your thinking.",
        "Describe a time you failed. What did you learn and what would you do differently?",
        "Tell me about a time you had to learn a completely new technology quickly to deliver a project.",
        "Give an example of when you had to balance quality versus speed. What did you decide and why?",
        "Tell me about a time you disagreed with a technical decision that had already been made. What did you do?",
        "Describe a situation where you had to work with a very difficult colleague. How did you manage it?",
        "Tell me about a time you went above and beyond what was expected of you on a project.",
        "Give an example of a project you are most proud of. What made it special?",
        "Tell me about a time you had to give difficult feedback to a peer. How did you deliver it?",
        "Describe a time when you had to make a decision with very limited information. What was your process?",
        "Tell me about a time you saw a process that wasn't working and took the initiative to fix it.",
        "Give an example of when you used data to change someone's mind.",
        "Tell me about a time you had to disagree with a customer or stakeholder. How did you handle it?",
        "Describe a time when priorities changed mid-sprint or mid-project. How did you adapt?",
        "Tell me about the most impactful bug you ever found and fixed in production.",
        "Give an example of a time you mentored someone. What was your approach?",
        "Tell me about a time you had to deliver bad news to your team or manager. How did you do it?",
        "Describe the biggest technical risk you ever took. Did it pay off?",
        "Tell me about a time you had to roll back a release. What happened and what did you learn?",
        "Give an example of when you had to sacrifice a long-term goal for a short-term one. Was it worth it?",
        "Tell me about a time you worked on a cross-functional team with non-engineers. How did you communicate?",
        "Describe a time when you had to estimate the effort for an ambiguous project. How did you approach it?",
        "Tell me about a project that changed significantly in scope. How did you manage the change?",
        "Give an example of a time you pushed back on a product decision. What was the outcome?",
        "Tell me about a time you automated something that was previously done manually. What was the impact?",
        "Describe how you have handled on-call duties or production incidents in the past.",
        "Tell me about a time you had to collaborate with a remote or distributed team. What challenges did you face?",
        "Give an example of when you left code or a system better than you found it.",
        "Tell me about a technical decision you made that you later regretted. What did you learn?",
        "Describe how you stay current with new technologies. Give a recent example.",
        "Tell me about a time you had to advocate for engineering best practices to a non-technical audience.",
        "Give an example of when your attention to detail caught a problem others had overlooked.",
    ],
    "system_design": [
        "Design a URL shortener like bit.ly that handles 100 million URLs and 1 billion reads per day.",
        "How would you design Google Search's autocomplete suggestion system?",
        "Design a distributed rate limiter that works across multiple data centres.",
        "Walk me through the architecture of a real-time collaborative document editor like Google Docs.",
        "How would you design a notification system that sends push, email, and SMS at massive scale?",
        "Design YouTube's video upload and transcoding pipeline.",
        "How would you build a global leaderboard for an online game with millions of concurrent players?",
        "Design Twitter's tweet fanout and timeline generation system.",
        "How would you design a distributed key-value store like DynamoDB or Cassandra?",
        "Design a ride-sharing system like Uber — focus on the real-time driver-matching component.",
        "How would you design a distributed message queue like Kafka?",
        "Design a search engine's web crawler and indexing pipeline at Google scale.",
        "How would you design a distributed cache layer like Redis Cluster?",
        "Design an Instagram-scale photo storage and delivery system.",
        "How would you design a Dropbox or Google Drive file storage and sync service?",
        "Design a payment processing system that handles millions of transactions per day safely.",
        "How would you design an ad serving system that selects the most relevant ad in under 50ms?",
        "Design a live streaming platform like Twitch — how do you handle encoding, CDN, and real-time chat?",
        "How would you design a hotel reservation or flight booking system with strong consistency?",
        "Design a distributed job scheduler that reliably executes millions of background tasks.",
        "How would you design a fraud detection system for a large e-commerce platform?",
        "Design a recommendation engine for a music streaming service like Spotify.",
        "How would you design a real-time analytics dashboard that ingests billions of events per day?",
        "Design WhatsApp's messaging system — focus on delivery guarantees and end-to-end encryption architecture.",
        "How would you design a distributed transaction system with ACID guarantees across microservices?",
        "Design the Google Maps route calculation and ETA prediction system.",
        "How would you design a content delivery network to serve static assets globally with sub-100ms latency?",
        "Design a stock trading platform that matches buy and sell orders with very low latency.",
        "How would you build a multi-tenant SaaS platform with strong data isolation between customers?",
        "Design a code repository and CI/CD pipeline system like GitHub.",
    ],
    "coding": [
        "How would you find the longest substring without repeating characters in a string? Walk me through your approach verbally.",
        "Given an array of integers, how do you find two numbers that sum up to a target value? Compare brute force vs hash map approaches.",
        "Explain how you would detect a cycle in a linked list. What is Floyd's Cycle Finding Algorithm and how does it work?",
        "How would you merge two sorted linked lists into one sorted list? Walk through the iterative and recursive solutions.",
        "Describe how to binary-search an item in a rotated sorted array. How do you decide which half is sorted?",
        "Given a binary tree, how would you find its maximum depth? Contrast DFS and BFS implementations.",
        "How do you validate whether a given binary tree is a valid Binary Search Tree?",
        "Explain how you would implement a LRU (Least Recently Used) cache with O(1) time complexity for get and put operations.",
        "Given an unsorted array, how would you find the k-th largest element without sorting the entire array?",
        "How would you reverse a linked list in-place? Trace pointer changes step by step.",
        "Explain how to check if a string of brackets is valid. What data structure would you use?",
        "Given an array of intervals, how would you merge all overlapping intervals?",
        "How would you calculate the maximum subarray sum in an array? Explain Kadane's algorithm.",
        "Describe how to search a 2D matrix where each row and column is sorted.",
        "How would you implement a Min Stack that supports push, pop, top, and retrieving the minimum element in O(1) time?",
        "Explain how to find all anagrams of a pattern in a text string using a sliding window.",
        "How do you clone a graph with directed and undirected edges? Walk through BFS vs DFS cloning.",
        "Given an array of daily temperatures, how would you find how many days you have to wait for a warmer temperature?",
        "How would you implement a Trie (Prefix Tree) with insert, search, and startsWith methods?",
        "Describe how you would find the lowest common ancestor of two nodes in a Binary Search Tree vs a general Binary Tree.",
        "How would you solve the Word Search problem on a 2D grid using backtracking?",
        "Explain how to serialize and deserialize a binary tree into a string and back.",
        "How would you find the median of a continuous stream of data? Explain the dual-heap approach.",
        "Given a set of candidate numbers, how would you find all unique combinations that sum to a target?",
        "How would you solve the Coin Change problem (minimum coins required to make an amount)? Compare recursive DP vs iterative DP.",
        "Explain how to find the longest palindromic substring in a string. Compare expanding around center vs Manacher's algorithm.",
        "How would you find the shortest path in a weighted graph with non-negative edge weights? Explain Dijkstra's algorithm.",
        "Describe how to topological-sort a directed acyclic graph (DAG). Where is this used in real software?",
        "Given an array representing heights of bars, how would you calculate how much rain water can be trapped after raining?",
        "How would you implement an Autocomplete system using a Trie and a Priority Queue?",
    ],
    "debugging": [
        "Suppose a microservice is experiencing high latency spikes every 5 minutes. Walk me through your debugging methodology.",
        "A Java/Go web server is running out of memory (OOM) after running for 48 hours in production. How do you diagnose the memory leak?",
        "An API endpoint returns HTTP 500 intermittently for 1% of requests under heavy load. How do you isolate the root cause?",
        "A PostgreSQL query that normally executes in 10ms suddenly takes 15 seconds. What diagnostic steps do you take?",
        "Your team deployed a new feature and CPU utilization jumped from 20% to 95%. How do you roll back or debug safely?",
        "A Redis cache instance is throwing out-of-memory errors despite having sufficient memory allocated. What key parameters do you check?",
        "Two microservices deadlocked while executing distributed transactions. How do you analyze the sequence of events and prevent it?",
        "A Python service is throwing 'Connection pool exhausted' errors under concurrency. How do you resolve it?",
    ],
    "googliness": [
        "Tell me about a time you did the right thing for a user or team, even when it was inconvenient or unsupported by management.",
        "Give an example of how you foster an inclusive environment when team members have strongly conflicting views.",
        "Describe a time you navigated ambiguity when project goals changed fundamentally mid-execution.",
        "Tell me about a time you proactively stepped up to solve a problem that wasn't strictly in your job description.",
        "How do you handle receiving critical feedback on code or design that you spent weeks crafting?",
    ],
    "targeted_debrief": [
        "Let's review the technical trade-offs you discussed earlier. If you had 2 more weeks, what would you re-architect?",
        "Looking back at the interview exercises today, which question challenged your assumptions the most and why?",
        "What key lessons or weak areas did you identify in your responses today, and how do you plan to address them?",
    ],
}

# Alias mapping for round names / categories
_CATEGORY_ALIASES: dict[str, str] = {
    "coding_1": "coding",
    "coding_2": "coding",
    "technical": "coding",
    "hr": "behavioural",
    "behavioral": "behavioural",
    "architecture": "system_design",
    "design": "system_design",
}


def _topic_terms(topic: str) -> list[str]:
    """Extract lowercase search terms from a topic string."""
    clean = (topic or "").strip().lower().replace("-", " ").replace("_", " ")
    parts = clean.split()
    return [p for p in parts if len(p) >= 3]


def _filter_questions_by_topic(pool: list[str], topic: str) -> list[str]:
    """Filter a pool of questions matching topic terms."""
    terms = _topic_terms(topic)
    if not terms or not pool:
        return pool

    matched = [
        q for q in pool
        if any(term in q.lower() for term in terms)
    ]
    return matched if matched else pool


def select_session_questions(
    round_name: str,
    category: str = "",
    topic: str = "",
    difficulty: str = "medium",
    count: int = 4,
) -> list[str]:
    """Select a focused bank of questions for a candidate session.

    Ensures balanced coverage without repeating questions.
    """
    primary = (category or round_name or "behavioural").lower().strip().replace(" ", "_")
    primary = _CATEGORY_ALIASES.get(primary, primary)

    pool = _QUESTIONS.get(primary) or _QUESTIONS.get("behavioural", [])

    if topic:
        pool = _filter_questions_by_topic(pool, topic)

    sample_size = min(count, len(pool))
    selected = random.sample(pool, sample_size) if sample_size > 0 else []

    logger.info(
        f"[questions] Selected {len(selected)} questions for round='{round_name}', "
        f"category='{primary}', topic='{topic}'"
    )
    return selected


def get_all_categories() -> list[str]:
    """Return all available question categories."""
    return list(_QUESTIONS.keys())
