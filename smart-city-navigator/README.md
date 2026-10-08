# City Hub Navigator

An indoor navigation web app for a two-floor smart city building (lobby, permits, library, clinic, transport hub, council, innovation lab and more). It draws an interactive SVG floor plan, finds the shortest walking route with Dijkstra's algorithm, and writes turn-by-turn directions. Plain HTML, CSS and JavaScript, with no dependencies and no build step.

**Live demo:** `https://<your-username>.github.io/smart-city-navigator/` (after enabling GitHub Pages)

## Features
- Interactive SVG floor plan with two floors, keyboard accessible (Tab, then Enter to select a room)
- Tap rooms on the map or use the dropdowns to set the start and destination
- Shortest-route search with distance in metres and estimated walking time
- **Step-free mode** that avoids stairs and routes through the elevator
- Animated route overlay that follows the route across floors (respects reduced motion)
- Shareable links: the route is stored in the URL hash, for example `#from=lobby&to=clinic&sf=1`
- Responsive layout that puts the map first on phones

## How it works
Each room has a door node on the corridor centre line. Neighbouring nodes on the same floor are linked by their corridor distance, and the stairs and elevator link the floors. `shortest()` runs Dijkstra over that graph, and in step-free mode it ignores edges marked as stairs. The path is then turned into polylines for drawing and into plain-language directions.

## Run locally
```bash
git clone https://github.com/<your-username>/smart-city-navigator.git
cd smart-city-navigator
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploy on GitHub Pages
Push to `main`, then set Settings, Pages, Source to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` does the rest.

## Structure
```
index.html        page shell
css/style.css     layout and map styling
js/main.js        floor data, graph, Dijkstra, directions, rendering
```

## Adding your own building
Edit the `DATA` array in `js/main.js`. Each row is `id, name, floor, x, y, width, height` and an optional type (`stairs` or `lift`). Add matching stairs and lift entries on every floor.

## Roadmap
- Load floor plans from JSON files
- QR-code check-in points to set the start location on arrival
- Crowd-aware routing using live occupancy data
- Voice guidance and a high-contrast theme

## License
MIT. See [LICENSE](LICENSE).
