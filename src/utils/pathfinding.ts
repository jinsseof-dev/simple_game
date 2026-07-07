export interface Point {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start to current node
  h: number; // Estimated cost from current node to end (Heuristic)
  f: number; // Total cost (g + h)
  parent: AStarNode | null;
}

/**
 * A* Pathfinding algorithm for a 2D grid.
 * Only allows orthogonal (4-way) movement to mimic classic SRPG mechanics.
 * 
 * @param start Starting coordinates {x, y}
 * @param end Target coordinates {x, y}
 * @param gridWidth The width of the map grid
 * @param gridHeight The height of the map grid
 * @param obstacleGrid A 2D boolean array where true indicates an obstacle/blocked tile
 * @returns Array of points representing the path from start to end (inclusive), or empty array if no path is found.
 */
export function findPath(
  start: Point,
  end: Point,
  gridWidth: number,
  gridHeight: number,
  obstacleGrid: boolean[][]
): Point[] {
  // If start or end is out of bounds, or if the end target is blocked
  if (
    start.x < 0 || start.x >= gridWidth ||
    start.y < 0 || start.y >= gridHeight ||
    end.x < 0 || end.x >= gridWidth ||
    end.y < 0 || end.y >= gridHeight
  ) {
    return [];
  }

  // If target is blocked, we can't find a path
  if (obstacleGrid[end.y] && obstacleGrid[end.y][end.x]) {
    return [];
  }

  const openSet: AStarNode[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: manhattanDistance(start, end),
    f: manhattanDistance(start, end),
    parent: null,
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f score
    let currentIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIdx].f) {
        currentIdx = i;
      }
    }

    const currentNode = openSet[currentIdx];

    // Check if reached destination
    if (currentNode.x === end.x && currentNode.y === end.y) {
      const path: Point[] = [];
      let temp: AStarNode | null = currentNode;
      while (temp !== null) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse(); // Path from start to end
    }

    // Remove from open set, add to closed set
    openSet.splice(currentIdx, 1);
    closedSet.add(`${currentNode.x},${currentNode.y}`);

    // Generate neighbors (4-way orthogonal movement)
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ];

    for (const dir of directions) {
      const neighborX = currentNode.x + dir.x;
      const neighborY = currentNode.y + dir.y;

      // Out of bounds check
      if (
        neighborX < 0 || neighborX >= gridWidth ||
        neighborY < 0 || neighborY >= gridHeight
      ) {
        continue;
      }

      // Obstacle check
      if (obstacleGrid[neighborY] && obstacleGrid[neighborY][neighborX]) {
        continue;
      }

      // Closed set check
      if (closedSet.has(`${neighborX},${neighborY}`)) {
        continue;
      }

      const gScore = currentNode.g + 1; // Distance between neighbors is 1

      // Find if neighbor is already in open set
      let existingNode = openSet.find(node => node.x === neighborX && node.y === neighborY);

      if (!existingNode) {
        const hScore = manhattanDistance({ x: neighborX, y: neighborY }, end);
        const newNode: AStarNode = {
          x: neighborX,
          y: neighborY,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: currentNode,
        };
        openSet.push(newNode);
      } else if (gScore < existingNode.g) {
        // Found a better path to this node
        existingNode.g = gScore;
        existingNode.f = gScore + existingNode.h;
        existingNode.parent = currentNode;
      }
    }
  }

  return []; // No path found
}

function manhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}
