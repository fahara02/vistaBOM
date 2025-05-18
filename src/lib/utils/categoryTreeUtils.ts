import type { Category } from '@/types/types';

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
 * Convert an array of Category objects to a hierarchical tree of TreeNode objects
 * @param categories Array of Category objects with hierarchical structure
 * @returns Array of TreeNode objects for top-level categories (with nested children)
 */
export function categoriesToTreeNodes(categories: Category[]): TreeNode[] {
  // Enhanced debugging for input data
  console.log(`Building tree from ${categories.length} categories`);
  if (categories.length > 0) {
    // Log a sample category to help debugging
    console.log('Sample category:', JSON.stringify(categories[0], null, 2));
  }

  // Safety check - if there are no categories, return empty array
  if (!categories || categories.length === 0) {
    console.warn('No categories provided to tree builder');
    return [];
  }

  // Check if the data already has a nested structure (with children array)
  const hasNestedStructure = categories.length > 0 && Array.isArray((categories[0] as any).children);
  console.log('Data format:', hasNestedStructure ? 'nested with children' : 'flat list');

  if (hasNestedStructure) {
    // Handle already nested data format
    return buildTreeFromNestedData(categories);
  } else {
    // Handle flat data format
    return buildTreeFromFlatData(categories);
  }
}

/**
 * Build a tree from already nested category data with children arrays
 */
function buildTreeFromNestedData(categories: any[]): TreeNode[] {
  // Function to recursively convert nested categories to TreeNodes
  function convertCategoryToNode(category: any): TreeNode {
    // Create node for current category
    const node: TreeNode = {
      nodePath: category.category_path || category.path || category.category_id || category.id,
      title: category.category_name || category.name,
      hasChildren: Array.isArray(category.children) && category.children.length > 0,
      data: category,
      expanded: false,
      selected: false,
      children: []
    };

    // Process children if they exist
    if (Array.isArray(category.children) && category.children.length > 0) {
      // Convert children to TreeNodes with proper filtering of deleted items
      const childNodes = category.children
        .filter((child: any) => {
          // Only check properties that actually exist in the schema
          return child && child.is_deleted === false && child.deleted_at === null;
        })
        .map((child: any) => convertCategoryToNode(child));

      // Sort children by name
      childNodes.sort((a: TreeNode, b: TreeNode) => a.title.localeCompare(b.title));
      
      // Assign to node.children (which is already initialized as [])
      node.children = childNodes;
    }

    return node;
  }

  // Filter out deleted categories and convert to TreeNodes - only use actual schema properties
  const rootNodes = categories
    .filter(cat => {
      // Only check properties that actually exist in the schema
      return cat && cat.is_deleted === false && cat.deleted_at === null;
    })
    .map(category => convertCategoryToNode(category));

  // Sort root nodes by name
  rootNodes.sort((a: TreeNode, b: TreeNode) => a.title.localeCompare(b.title));

  // Add detailed logging to help debug tree issues
  console.log(`Tree building complete. Returning ${rootNodes.length} root nodes from nested data`);
  
  // Log the tree structure for debugging
  if (rootNodes.length > 0) {
    console.log('Tree structure:', 
      rootNodes.map(node => ({
        name: node.title,
        childCount: node.children?.length || 0,
        hasChildren: node.hasChildren
      }))
    );
  }
  return rootNodes;
}

/**
 * Build a tree from flat category data using parent_id relationships
 */
function buildTreeFromFlatData(categories: Category[]): TreeNode[] {
  // Filter out any deleted categories with strict comparison
  const activeCategories = categories.filter(cat => {
    return cat && 
      cat.category_id && 
      cat.is_deleted === false && 
      cat.deleted_at === null; // Additional check for soft deletion
  });
  console.log(`After filtering, working with ${activeCategories.length} active categories`);
  
  // Create maps for quick lookups - we'll use two separate approaches for safety
  const childrenMap = new Map<string, Category[]>();  // parentId -> children
  const categoryMap = new Map<string, Category>();    // id -> category
  
  // First pass: index all categories by ID
  for (const category of activeCategories) {
    if (category.category_id) {
      categoryMap.set(category.category_id, category);
    }
  }
  
  // Second pass: group by parent ID
  for (const category of activeCategories) {
    // Skip categories without an ID (should be filtered already but double check)
    if (!category.category_id) continue;
    
    // If category has a parent, add it to that parent's children list
    if (category.parent_id) {
      // Verify the parent exists in our data set
      if (categoryMap.has(category.parent_id)) {
        if (!childrenMap.has(category.parent_id)) {
          childrenMap.set(category.parent_id, []);
        }
        childrenMap.get(category.parent_id)?.push(category);
      } else {
        // If parent doesn't exist, treat this as a root category
        console.warn(`Category "${category.category_name}" has parent_id ${category.parent_id} which does not exist in the dataset. Treating as root.`);
      }
    }
  }
  
  // Debug parent-child relationships
  console.log(`Found ${childrenMap.size} categories with children`);
  
  // Create TreeNode objects for all categories
  const nodeMap = new Map<string, TreeNode>();
  
  // First create all nodes
  for (const category of activeCategories) {
    const id = category.category_id;
    if (!id) continue;
    
    // Check if this category has children
    const hasChildren = childrenMap.has(id) && (childrenMap.get(id)?.length || 0) > 0;
    
    // Use category_path from database or build from ID
    const nodePath = category.category_path || id;
    
    // Create the node
    const node: TreeNode = {
      nodePath,
      title: category.category_name,
      hasChildren,
      data: category,
      expanded: false,  // Collapsed by default
      selected: false,  // Not selected by default
      children: []      // Initialize with empty children array
    };
    
    nodeMap.set(id, node);
  }
  
  // Second pass: build tree structure by connecting children to parents
  for (const [parentId, childCategories] of childrenMap.entries()) {
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) continue;
    
    // Sort children alphabetically by name for consistent display
    const sortedChildren = [...childCategories].sort((a, b) => 
      a.category_name.localeCompare(b.category_name));
    
    // Add children to parent
    parentNode.children = sortedChildren
      .map(child => nodeMap.get(child.category_id))
      .filter(Boolean) as TreeNode[];
  }
  
  // Find root nodes (categories without parents or with missing parents)
  const rootNodes = activeCategories
    .filter(category => !category.parent_id || !categoryMap.has(category.parent_id))
    .map(category => nodeMap.get(category.category_id))
    .filter(Boolean) as TreeNode[];
  
  // Sort root nodes alphabetically by name
  rootNodes.sort((a: TreeNode, b: TreeNode) => a.title.localeCompare(b.title));
  
  console.log(`Tree building complete. Returning ${rootNodes.length} root nodes from flat data:`, 
    rootNodes.map(node => node.title).join(', '));
    
  // Log the tree structure for debugging
  if (rootNodes.length > 0) {
    console.log('Tree structure:', 
      rootNodes.map(node => ({
        name: node.title,
        childCount: node.children?.length || 0,
        hasChildren: node.hasChildren
      }))
    );
  }
  
  return rootNodes;
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
    if (node.data?.category_id === categoryId) {
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
    if (node.data?.category_id === categoryId) {
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
