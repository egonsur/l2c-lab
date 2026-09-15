# L2C Lab
Open index.html in a modern browser. No installation or network is required for the labs. Lab 1 and Lab 2 are implemented; Lab 3 remains Coming soon.

## Lab 2 geometry
Raw terrain elevations depend only on normalized horizontal position and scenario. The hill remains 30 m high at any link distance. Buildings and trees are separate physical obstacles above local terrain. Antenna phase centers equal endpoint terrain plus mounting rooftop height (when present) plus mast height.

LoS is always the straight line between the phase centers. The first Fresnel radius is sqrt((c/f)*d1*d2/(d1+d2)); upper/lower boundaries are LoS plus/minus that radius. The envelope closes at both endpoints. Changing curvature never moves LoS or the Fresnel zone.

Earth correction is independently d1*d2/(2*k*R), with k = 4/3 and R = 6,371,000 m. The effective-Earth display positions terrain and obstacle tops at their raw elevations plus this correction. The solid ground therefore curves relative to the straight LoS. A dashed raw-terrain reference and explicit hill/Earth labels distinguish actual elevation from curvature. Numeric terrain elevations remain unchanged with distance. This replaces the former sagging-path representation.

The fixed Y scale is -40 to 150 m above the endpoint chord. No autoscaling is applied. Clearance is LoS minus (terrain + physical obstacle height + Earth correction). Good means clear LoS and at least 60% first-Fresnel-radius clearance; Marginal means clear LoS but insufficient 60% clearance; Blocked means an obstacle or ground intersects LoS. Calculations sample 1,001 points and use a small-angle Fresnel path-profile approximation.

## Urban Rooftop Link
Scenario 4 replaces Create your own. Defaults: 2 km, 5 GHz, Site A roof 20 m, Site B roof 24 m, each mast 5 m above its roof, and a 26 m intervening building. Phase centers are 25 m and 29 m. The default is Marginal. Raising the intervening building to 35 m blocks LoS; raising both masts to 10 m restores good geometry.

Controls adjust both roof heights (10–40 m), intervening building height (10–45 m), mast heights (5–50 m), distance, frequency and curvature. Roofs and building footprints are normalized scenario data, independent of distance. All scenarios remain editable. Reset restores the selected preset.

The tree-line model remains continuous 16 m vegetation over 42–58% of the path. Illustrations are positioned on the effective-Earth terrain with physical height preserved; decorative canopy width and gaps never determine obstruction calculations.

## Files and checks
tower-model.js contains model and presets; tower.js contains Lab 2 UI; tower.css contains its styles. data.js, engine.js and app.js provide Lab 1 and shared navigation.
Open regression.html for repeatable model and browser checks. Coverage includes terrain invariance, straight LoS, pointwise Fresnel symmetry and endpoint closure, curvature-independent radio geometry, effective-Earth clearance, tree physical/decorative separation, urban roof/mast/obstacle controls and outcomes, reset, and the complete Lab 1 flow.

This is educational geometry, not RF planning. It does not calculate received power, diffraction loss, interference, rain availability or licensing. Technical guidance is linked in the app; real deployments require surveys, local spectrum checks, link budgets and availability planning.


## Lab 3 — Connectivity Cost Challenge
Lab 3 is a fictional Willow District strategy game. It includes a $100,000 initial budget, five public institutions, a town fiber PoP, mobile coverage, predefined radio-path checks, a remote satellite option, and varied power conditions. Select a site on the map, compare fiber, FWA, point-to-point wireless and LEO satellite, then deploy, revise, remove or undo connections.

The game keeps CAPEX and annual OPEX separate. After two deployments it exposes initial cost, 5-year TCO and 10-year TCO views using TCO = CAPEX + annual OPEX × years. Sites always include a local Wi-Fi/Ethernet package. Solar + battery and independent backup are optional add-ons. A connection must have a valid upstream path; only fiber and point-to-point links can relay in this scenario, FWA requires Good mobile coverage, and radio routes use predefined teaching results.

School B demand growth and a scripted health-facility outage drill appear after several deployments. The health facility is evaluated more strictly for continuity, and backups only restore strong resilience when the backup service has enough modeled capacity. Shared relays aggregate downstream demand and carry a maintainability coordination trade-off. Over-budget plans remain editable so the learner can compare strategies.

The results page shows coverage, affordability, performance, resilience, maintainability and long-term sustainability as separate dimensions. It also compares the learner’s plan with a fixed transparent alternative strategy, preserving the lesson that different priorities produce different designs. View assumptions exposes technology characteristics, fictional costs, demand loads, path constraints and scoring rules.

Lab 3 files: cost-scenario.js, cost-topology.js, cost-finance.js, cost-suitability.js, cost-scorecard.js, cost-ui.js and cost.css. Open cost-regression.html for repeatable checks. The current suite passes 73 model and browser checks, with additional deterministic cost, topology, power, TCO, event, reset, undo and over-budget coverage.

