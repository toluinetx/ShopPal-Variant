export type Category =
    | 'beauty'
    | 'fragrances'
    | 'furniture'
    | 'groceries'
    | 'home-decoration'
    | 'kitchen-accessories'
    | 'laptops'
    | 'mens-shirts'
    | 'mens-shoes'
    | 'mens-watches'
    | 'mobile-accessories'
    | 'motorcycle'
    | 'skin-care'
    | 'smartphones'
    | 'sports-accessories'
    | 'sunglasses'
    | 'tablets'
    | 'tops'
    | 'vehicle'
    | 'womens-bags'
    | 'womens-dresses'
    | 'womens-jewellery'
    | 'womens-shoes'
    | 'womens-watches';

export const CATEGORIES: Category[] = [
    'beauty',
    'fragrances',
    'furniture',
    'groceries',
    'home-decoration',
    'kitchen-accessories',
    'laptops',
    'mens-shirts',
    'mens-shoes',
    'mens-watches',
    'mobile-accessories',
    'motorcycle',
    'skin-care',
    'smartphones',
    'sports-accessories',
    'sunglasses',
    'tablets',
    'tops',
    'vehicle',
    'womens-bags',
    'womens-dresses',
    'womens-jewellery',
    'womens-shoes',
    'womens-watches',
];

export type Dimension = {
    width: number | null;
    height: number | null;
    depth: number | null;
    weight: number | null;
};

export type Product = {
    product_id: string;
    title: string;
    description: string | null;
    category: Category;
    price: number;
    rating: number;
    stock: number;
    images: string[] | null;
    thumbnail: string | null;
    brand: string | null;
    return_policy: string | null;
    shipping_info: string | null;
    warranty_info: string | null;
    dimension: Dimension | null;
};

export type ProductInput = Omit<Product, 'product_id'>;

export type NameDetails = {
    first_name: string;
    last_name: string;
    middle_name?: string;
};

export type Admin = {
    user_id: string;
    email: string;
    username: string;
    name_details: NameDetails;
    admin_since: string;
};
