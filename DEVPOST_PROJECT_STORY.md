## Inspiration

I worked as a VC analyst, and this is the kind of work I did every day, including tracking growth, inflation, interest rates, and volatility, then asking what changes in the macro environment could mean for different assets and portfolios.

### The problem

- **AI agents can help with this work, but their answers may vary depending on how a question is phrased or which tools and instructions are available.**
- **A dashboard provides a more consistent and visual way to present the analysis, but traditional dashboards can be difficult to customize for every scenario and portfolio.**

WebMCP is a good solution. The agent translates a user's question into structured inputs, **while the dashboard applies the same analysis framework and displays the result in a consistent, visual format.**

## What it does

Asset Analysis helps users:

1. Understand how current macro conditions and hypothetical events may affect U.S. stocks, cash, gold, and crypto.
2. Analyze how a portfolio may be affected by current or potential macro scenarios.

## How we built it

I built the website with Codex.

I started with the core product experience: a market overview showing how current macro conditions affect four asset classes. I then added detailed analysis for each asset and a portfolio view that combines those signals based on the user's allocation.

I created the first working version with Codex, tested it, and iterated on the design and interactions until the experience felt clear. I then asked Codex to add WebMCP tools for the two main workflows: analyzing a specific macro scenario and evaluating a specific portfolio. These tools allow AI agents to interact directly with the website. The finished application was deployed with Vercel.

## Challenges we ran into

**The biggest challenge was accuracy and trust.** How can a user know whether the agent and the website reached a reasonable conclusion?

To address this, I made the underlying factors visible. Users can see how changes in growth, inflation, interest rates, credit spreads, oil, the U.S. dollar, and volatility contribute to each result. They can inspect the reasoning and decide whether they agree with the assumptions.

The analysis also uses a fixed framework. This limits the agent's freedom, but that constraint is intentional. It makes the results more consistent, comparable, and easier to verify.

## Accomplishments that we're proud of

- The visualization makes the analysis much easier to understand than a text-only response from an agent. I am especially proud of the interactive scenario compass, which lets users explore different macro events by clicking the circles.
- The website can analyze a custom portfolio and display its potential tailwinds and headwinds within seconds. This makes personalized scenario analysis fast and convenient.

## What we learned

The main question I kept returning to was: What is the best way for humans and agents to work together?

I learned two things:

1. **Agents need a framework.** If an agent receives an open-ended request without tools or constraints, its answer may vary from one conversation to another.
2. **Humans need visualization.** This was especially important to me. A long text response is difficult to scan, even when it contains the same information as a well-designed dashboard.

In this project, the dashboard gives the user a clear and consistent interface. The agent acts as the analyst and point of contact, translating natural-language requests into structured WebMCP tool calls that update the page.

I believe this is a useful model for agentic products: the agent provides flexibility, while the website provides structure, context, and results that people can easily inspect.

## What's next for Asset Analysis

- Add more data sources and use MCP integrations to improve the depth and accuracy of the analysis.
- Build more advanced asset analysis, including valuation models and other methods for producing quantified valuations.
- Support more asset classes and potentially add price changes and historical performance to the dashboard.
