# L2C Lab

L2C Lab is a collection of interactive learning experiences designed to help communities, local connectivity implementers and decision-makers understand how digital connectivity can be planned, deployed and sustained.

Open `index.html` in a modern browser. No installation or network connection is required to use the five labs. The application is a dependency-free static site with local HTML, CSS and JavaScript; Lab 2's optional ITU-R guidance link requires a connection only if opened.

## Available Labs

### Lab 1 — Connectivity Solution Builder
**How should I connect this location?** Explore fiber, 4G/5G FWA, point-to-point wireless and LEO satellite, with transparent explanations of infrastructure, geography, power and project priorities.

### Lab 2 — Can You See the Tower?
**Can I establish a wireless link between these two locations?** Experiment with distance, antenna heights, frequency, terrain, line of sight, vegetation, buildings, Fresnel clearance and effective Earth curvature.

### Lab 3 — Connectivity Cost Challenge
**Can you connect a community within budget — and make the solution sustainable?** Design a fictional district network while balancing CAPEX, OPEX, TCO, performance, power, reuse, resilience and maintainability.

### Lab 4 — Wi‑Fi Designer
**The Internet has reached the site. How do you connect the users?** Design a school Wi‑Fi network with indoor/outdoor APs, Wi‑Fi 5/6/6E/7, frequency bands, coverage versus capacity, contention, compatibility and a building-to-building P2P bridge.

### Lab 5 — Power Your Connection
**How do you keep a connectivity site powered?** Build a simple solar, battery and grid plan, simulate 24 hours, compare sunny and cloudy conditions, and learn how equipment loads, user devices, operating hours and stored energy affect availability.

## Purpose

The labs are educational tools intended to make connectivity concepts easier to understand through experimentation and visual interaction. They use simplified models and illustrative assumptions. They are not substitutes for professional network planning, RF engineering, site surveys, equipment selection, electrical design or detailed techno-economic analysis.

## Project structure

The application is a dependency-free static site. Keep the files in the same directory and open `index.html` directly in a modern browser. Lab 5 uses `power-model.js`, `power-ui.js` and `power.css`; `power-regression.html` provides local model checks. No authentication, database or server is required.

All costs, capacities, terrain, demand, power loads, solar generation and rating rules are fictional or qualitative learning assumptions.
