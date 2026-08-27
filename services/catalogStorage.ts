export type PropertyDataType =
  | 'STRING'
  | 'TEXT'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'SINGLE_SELECT'
  | 'YEAR';

export type CategoryItem = {
  id: string;
  parentId?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
};

export type CategoryPropertyItem = {
  id: string;
  categoryId: string;
  code: string;
  title: string;
  helpText?: string | null;
  dataType: PropertyDataType;
  isRequired: boolean;
  isPublicVisible: boolean;
  isFormVisible: boolean;
  isFilterable: boolean;
  sortOrder: number;
  isActive: boolean;
  version: number;
  options: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
  defaultValue?: unknown;
  uiMetadata?: Record<string, unknown>;
};

export type CatalogData = {
  categories: CategoryItem[];
  categoryProperties: CategoryPropertyItem[];
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
  description?: string | null;
  parentId?: string | null;
  status?: string;
  version?: number;
  children: CategoryTreeNode[];
};

export type CategoryFormDefinition = {
  categoryId: string;
  slug: string;
  name: string;
  properties: CategoryPropertyItem[];
};

import INITIAL_CATALOG from '../data/catalog.json';

const STORAGE_KEY = 'haradan_catalog_data';

class CatalogStorage {
  private data: CatalogData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): CatalogData {
    const initial: CatalogData = JSON.parse(JSON.stringify(INITIAL_CATALOG));
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.categoryProperties)) {
            // Ensure global category exists
            const globalCat = initial.categories.find(c => c.id === 'c1000000-0000-4000-8000-000000000000');
            if (globalCat && !parsed.categories.some((c: any) => c.id === globalCat.id)) {
              parsed.categories.unshift(globalCat);
            }
            // Ensure global properties exist if missing
            const globalProps = initial.categoryProperties.filter(p => p.categoryId === 'c1000000-0000-4000-8000-000000000000');
            for (const gp of globalProps) {
              if (!parsed.categoryProperties.some((p: any) => p.code === gp.code && (p.categoryId === gp.categoryId || p.id === gp.id))) {
                parsed.categoryProperties.unshift(gp);
              }
            }
            const ORPHAN_CODES = new Set([
              'liveFoalGuarantee',
              'mobileService',
              'insurance',
              'cameraTracking',
              'serviceType',
            ]);
            const ORPHAN_IDS = new Set([
              'p1000000-0000-4000-8000-000000000044',
              'p1000000-0000-4000-8000-000000000036',
              'p1000000-0000-4000-8000-000000000033',
              'p1000000-0000-4000-8000-000000000034',
              'p1000000-0000-4000-8000-000000000035',
            ]);
            parsed.categoryProperties = parsed.categoryProperties.filter(
              (p: any) => !ORPHAN_CODES.has(p.code) && !ORPHAN_IDS.has(p.id)
            );
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[CatalogStorage] Failed to read from localStorage:', e);
      }
    }
    return initial;
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        window.dispatchEvent(new Event('haradan_catalog_data_changed'));
        try {
          const bc = new BroadcastChannel('haradan_catalog_channel');
          bc.postMessage({ type: 'CATALOG_UPDATED', data: this.data });
          bc.close();
        } catch {}
      } catch (e) {
        console.warn('[CatalogStorage] Failed to write to localStorage:', e);
      }
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generatePropertyCode(title: string): string {
    let s = title
      .toUpperCase()
      .trim()
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/I|İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!s) s = 'PROPERTY';
    if (/^[0-9]/.test(s)) s = `P_${s}`;
    return s.slice(0, 64);
  }

  public resolveCategory(idOrSlug: string): CategoryItem | undefined {
    const clean = idOrSlug.replace(/^cat-/, '');
    return this.data.categories.find(
      (c) =>
        c.id === idOrSlug ||
        c.slug === idOrSlug ||
        c.slug === clean ||
        c.id === `cat-${clean}`
    );
  }

  public listCategories(activeOnly?: boolean): CategoryItem[] {
    const list = activeOnly
      ? this.data.categories.filter((c) => c.isActive)
      : this.data.categories;
    return [...list].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr')
    );
  }

  public getCategory(idOrSlug: string): CategoryItem | undefined {
    return this.resolveCategory(idOrSlug);
  }

  public createCategory(payload: {
    name: string;
    slug?: string;
    parentId?: string | null;
    description?: string | null;
  }): CategoryItem {
    const cleanName = payload.name.trim();
    let cleanSlug = payload.slug?.trim() || this.slugify(cleanName);
    if (!cleanSlug) cleanSlug = 'kategori';

    let candidate = cleanSlug;
    let counter = 1;
    while (this.data.categories.some((c) => c.slug === candidate)) {
      candidate = `${cleanSlug}-${counter}`;
      counter++;
    }

    const sameParentItems = this.data.categories.filter(
      (c) => (c.parentId || null) === (payload.parentId || null)
    );
    const maxSortOrder = sameParentItems.reduce(
      (max, item) => Math.max(max, item.sortOrder || 0),
      0
    );

    const newCategory: CategoryItem = {
      id: `c1000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`,
      parentId: payload.parentId || null,
      name: cleanName,
      slug: candidate,
      description: payload.description || null,
      isActive: true,
      sortOrder: maxSortOrder + 1,
      version: 1,
    };

    this.data.categories.push(newCategory);
    this.persist();
    return newCategory;
  }

  public updateCategory(
    idOrSlug: string,
    payload: {
      name?: string;
      slug?: string;
      sortOrder?: number;
      description?: string | null;
      expectedVersion?: number;
    }
  ): CategoryItem {
    const cat = this.resolveCategory(idOrSlug);
    if (!cat) {
      throw new Error('Kategori bulunamadı.');
    }

    if (payload.name !== undefined) {
      cat.name = payload.name.trim();
    }
    if (payload.slug !== undefined && payload.slug.trim()) {
      const targetSlug = this.slugify(payload.slug);
      const isTaken = this.data.categories.some(
        (c) => c.slug === targetSlug && c.id !== cat.id
      );
      if (!isTaken) {
        cat.slug = targetSlug;
      }
    }
    if (payload.sortOrder !== undefined) {
      cat.sortOrder = payload.sortOrder;
    }
    if (payload.description !== undefined) {
      cat.description = payload.description;
    }

    cat.version = (cat.version || 1) + 1;
    this.persist();
    return cat;
  }

  public setCategoryActive(
    idOrSlug: string,
    isActive: boolean,
    expectedVersion?: number
  ): CategoryItem {
    const cat = this.resolveCategory(idOrSlug);
    if (!cat) {
      throw new Error('Kategori bulunamadı.');
    }
    cat.isActive = isActive;
    cat.version = (cat.version || 1) + 1;

    if (!isActive) {
      const deactivateChildren = (parentId: string) => {
        const children = this.data.categories.filter((c) => c.parentId === parentId);
        for (const child of children) {
          child.isActive = false;
          child.version = (child.version || 1) + 1;
          deactivateChildren(child.id);
        }
      };
      deactivateChildren(cat.id);
    }

    this.persist();
    return cat;
  }

  public reparentCategory(
    idOrSlug: string,
    newParentId?: string | null,
    expectedVersion?: number
  ): CategoryItem {
    const cat = this.resolveCategory(idOrSlug);
    if (!cat) {
      throw new Error('Kategori bulunamadı.');
    }
    if (newParentId === cat.id) {
      throw new Error('Kategori kendisinin üst kategorisi olamaz.');
    }

    cat.parentId = newParentId || null;
    cat.version = (cat.version || 1) + 1;
    this.persist();
    return cat;
  }

  public reorderCategories(
    items: Array<{ id: string; sortOrder: number; expectedVersion?: number }>
  ): void {
    for (const item of items) {
      const cat = this.resolveCategory(item.id);
      if (cat) {
        cat.sortOrder = item.sortOrder;
        cat.version = (cat.version || 1) + 1;
      }
    }
    this.persist();
  }

  public listProperties(categoryIdOrSlug: string): CategoryPropertyItem[] {
    const cat = this.resolveCategory(categoryIdOrSlug);
    if (!cat) {
      return [];
    }

    let parentProps: CategoryPropertyItem[] = [];
    if (cat.parentId) {
      parentProps = this.listProperties(cat.parentId);
    }

    const direct = this.data.categoryProperties.filter(
      (p) => p.categoryId === cat.id || p.categoryId === cat.slug
    );

    // Merge parent properties with direct properties (direct overrides parent with same code)
    const merged = new Map<string, CategoryPropertyItem>();
    for (const p of parentProps) {
      merged.set(p.code, p);
    }
    for (const p of direct) {
      merged.set(p.code, p);
    }

    return Array.from(merged.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'tr')
    );
  }

  public createProperty(
    categoryIdOrSlug: string,
    payload: {
      code?: string;
      title: string;
      helpText?: string | null;
      dataType: PropertyDataType;
      isRequired?: boolean;
      isPublicVisible?: boolean;
      isFormVisible?: boolean;
      isFilterable?: boolean;
      sortOrder?: number;
      options?: Array<{ value: string; label: string }>;
      validation?: Record<string, unknown>;
      defaultValue?: unknown;
      uiMetadata?: Record<string, unknown>;
    }
  ): CategoryPropertyItem {
    const cat = this.resolveCategory(categoryIdOrSlug);
    if (!cat) {
      throw new Error('Kategori bulunamadı.');
    }

    const cleanTitle = payload.title.trim();
    let code = payload.code?.trim() || this.generatePropertyCode(cleanTitle);

    const existingInCat = this.data.categoryProperties.filter(
      (p) => p.categoryId === cat.id
    );

    let candidateCode = code;
    let counter = 1;
    while (existingInCat.some((p) => p.code === candidateCode)) {
      candidateCode = `${code}_${counter}`;
      counter++;
    }

    const maxSort = existingInCat.reduce(
      (m, p) => Math.max(m, p.sortOrder || 0),
      0
    );

    const newProp: CategoryPropertyItem = {
      id: `p1000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`,
      categoryId: cat.id,
      code: candidateCode,
      title: cleanTitle,
      helpText: payload.helpText || null,
      dataType: payload.dataType,
      isRequired: Boolean(payload.isRequired),
      isPublicVisible: payload.isPublicVisible !== false,
      isFormVisible: payload.isFormVisible !== false,
      isFilterable: payload.isFilterable !== false,
      sortOrder: payload.sortOrder ?? maxSort + 1,
      isActive: true,
      version: 1,
      options: payload.options || [],
      validation: payload.validation || {},
      defaultValue: payload.defaultValue,
      uiMetadata: payload.uiMetadata || {},
    };

    this.data.categoryProperties.push(newProp);
    this.persist();
    return newProp;
  }

  public updateProperty(
    categoryIdOrSlug: string,
    propertyId: string,
    patch: {
      title?: string;
      helpText?: string | null;
      isRequired?: boolean;
      isPublicVisible?: boolean;
      isFormVisible?: boolean;
      isFilterable?: boolean;
      sortOrder?: number;
      options?: Array<{ value: string; label: string }>;
      validation?: Record<string, unknown>;
      defaultValue?: unknown;
      uiMetadata?: Record<string, unknown>;
      expectedVersion?: number;
    }
  ): CategoryPropertyItem {
    const prop = this.data.categoryProperties.find((p) => p.id === propertyId);
    if (!prop) {
      throw new Error('Özellik bulunamadı.');
    }

    if (patch.title !== undefined) prop.title = patch.title.trim();
    if (patch.helpText !== undefined) prop.helpText = patch.helpText;
    if (patch.isRequired !== undefined) prop.isRequired = patch.isRequired;
    if (patch.isPublicVisible !== undefined) prop.isPublicVisible = patch.isPublicVisible;
    if (patch.isFormVisible !== undefined) prop.isFormVisible = patch.isFormVisible;
    if (patch.isFilterable !== undefined) prop.isFilterable = patch.isFilterable;
    if (patch.sortOrder !== undefined) prop.sortOrder = patch.sortOrder;
    if (patch.options !== undefined) prop.options = patch.options;
    if (patch.validation !== undefined) prop.validation = patch.validation;
    if (patch.defaultValue !== undefined) prop.defaultValue = patch.defaultValue;
    if (patch.uiMetadata !== undefined) prop.uiMetadata = patch.uiMetadata;

    prop.version = (prop.version || 1) + 1;
    this.persist();
    return prop;
  }

  public setPropertyActive(
    categoryIdOrSlug: string,
    propertyId: string,
    isActive: boolean,
    expectedVersion?: number
  ): CategoryPropertyItem {
    const prop = this.data.categoryProperties.find((p) => p.id === propertyId);
    if (!prop) {
      throw new Error('Özellik bulunamadı.');
    }
    prop.isActive = isActive;
    prop.version = (prop.version || 1) + 1;
    this.persist();
    return prop;
  }

  public deleteProperty(
    categoryIdOrSlug: string,
    propertyId: string,
    expectedVersion?: number
  ): void {
    const idx = this.data.categoryProperties.findIndex((p) => p.id === propertyId);
    if (idx !== -1) {
      this.data.categoryProperties.splice(idx, 1);
      this.persist();
    }
  }

  public reorderProperties(
    categoryIdOrSlug: string,
    items: Array<{ id: string; sortOrder: number; expectedVersion?: number }>
  ): void {
    for (const item of items) {
      const prop = this.data.categoryProperties.find((p) => p.id === item.id);
      if (prop) {
        prop.sortOrder = item.sortOrder;
        prop.version = (prop.version || 1) + 1;
      }
    }
    this.persist();
  }

  public buildTree(activeOnly = true): CategoryTreeNode[] {
    const categories = this.listCategories(activeOnly);
    const nodeMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    categories.forEach((cat) => {
      nodeMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        description: cat.description,
        parentId: cat.parentId,
        status: cat.isActive ? 'ACTIVE' : 'DELETED',
        version: cat.version,
        children: [],
      });
    });

    categories.forEach((cat) => {
      const node = nodeMap.get(cat.id);
      if (!node) return;

      if (cat.parentId) {
        const parent = nodeMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
          return;
        }
      }
      roots.push(node);
    });

    const sortNodes = (nodes: CategoryTreeNode[]) => {
      nodes.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.name.localeCompare(b.name, 'tr')
      );
      nodes.forEach((n) => sortNodes(n.children));
    };

    sortNodes(roots);
    return roots;
  }

  public getCategoryFormDefinition(
    categoryIdOrSlug: string
  ): CategoryFormDefinition | null {
    const cat = this.resolveCategory(categoryIdOrSlug);
    if (!cat || !cat.isActive) return null;

    const props = this.listProperties(cat.id).filter((p) => p.isActive);
    return {
      categoryId: cat.id,
      slug: cat.slug,
      name: cat.name,
      properties: props,
    };
  }
}

export const catalogStorage = new CatalogStorage();
