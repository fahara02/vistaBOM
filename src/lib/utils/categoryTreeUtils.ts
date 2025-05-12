import type { Category } from '$lib/server/db/types';

/**
 * TreeNode represents a node in our custom category tree view
 */
export interface TreeNode {
  nodePath: string;
  title: string;
  hasChildren: boolean;
  children?: TreeNode[];
  data?: Category; // Original category data
  expanded?: boolean;
  selected?: boolean;
}

/**
 * Converts an array of Category objects to the format needed by our custom TreeView component
 * @param categories Array of Category objects with hierarchical structure
 * @returns Array of TreeNode objects for top-level categories (with nested children)
 */
export function categoriesToTreeNodes(categories: Category[]): TreeNode[] {
  // Create maps for quick lookups
  const childrenMap = new Map<string, Category[]>();
  const nodeMap = new Map<string, TreeNode>();
  
  // Group categories by parent ID
  for (const category of categories) {
    if (category.parentId) {
      if (!childrenMap.has(category.parentId)) {
        childrenMap.set(category.parentId, []);
      }
      childrenMap.get(category.parentId)?.push(category);
    }
  }
  
  // Create tree nodes for all categories first
  for (const category of categories) {
    const nodePath = category.path || category.id;
    const hasChildren = childrenMap.has(category.id);
    
    const node: TreeNode = {
      nodePath,
      title: category.name,
      hasChildren,
      data: category,
      expanded: false,
      selected: false
    };
    
    nodeMap.set(category.id, node);
  }
  
  // Build the tree structure by adding children to parent nodes
  for (const [parentId, children] of childrenMap.entries()) {
    const parentNode = nodeMap.get(parentId);
    if (parentNode) {
      parentNode.children = children.map(child => nodeMap.get(child.id)).filter(Boolean) as TreeNode[];
    }
  }
  
  // Return only top-level categories (those without a parent)
  return categories
    .filter(category => !category.parentId)
    .map(category => nodeMap.get(category.id))
    .filter(Boolean) as TreeNode[];
}

/**
 * Finds a node in the tree by its ID, searching recursively through the entire tree
 * @param tree Array of TreeNode objects
 * @param categoryId ID of the category to find
 * @returns The found TreeNode or undefined
 */
export function findNodeById(tree: TreeNode[], categoryId: string): TreeNode | undefined {
  // Look through the top level
  for (const node of tree) {
    if (node.data?.id === categoryId) {
      return node;
    }
    
    // Recursively search children if they exist
    if (node.children?.length) {
      const result = findNodeById(node.children, categoryId);
      if (result) return result;
    }
  }
  
  return undefined;
}

/**
 * Finds the path to a node in the tree.
 * @param tree Array of TreeNode objects
 * @param categoryId ID of the category to find
 * @param currentPath Current path being built (used in recursion)
 * @returns Array of TreeNode objects representing the path from root to the node
 */
export function findPathToNode(tree: TreeNode[], categoryId: string, currentPath: TreeNode[] = []): TreeNode[] | null {
  for (const node of tree) {
    // Create a new path with this node
    const newPath = [...currentPath, node];
    
    // If this is the node we're looking for, return the path
    if (node.data?.id === categoryId) {
      return newPath;
    }
    
    // If this node has children, search them
    if (node.children?.length) {
      const result = findPathToNode(node.children, categoryId, newPath);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Selects a node in the tree by its ID and ensures its parents are expanded
 * @param tree Array of TreeNode objects
 * @param categoryId ID of the category to select
 * @returns Updated tree with the node selected and its parents expanded
 */
export function selectAndExpandToNode(tree: TreeNode[], categoryId: string): TreeNode[] {
  const updatedTree = JSON.parse(JSON.stringify(tree)) as TreeNode[];
  
  // Find the path to the node
  const path = findPathToNode(updatedTree, categoryId);
  if (!path) return updatedTree;
  
  // The last node in the path is the one we want to select
  const nodeToSelect = path[path.length - 1];
  
  // Mark the node as selected
  nodeToSelect.selected = true;
  
  // Expand all parent nodes in the path except the last one (which is the selected node)
  for (let i = 0; i < path.length - 1; i++) {
    path[i].expanded = true;
  }
  
  return updatedTree;
}
