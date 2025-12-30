// 골프장별 실제 이미지 매핑
export const GOLF_COURSE_IMAGES: Record<string, {
    logo: string;
    images: string[];
}> = {
    '베어크리크 춘천': {
        logo: 'https://www.bearcreek.co.kr/images/common/logo.png',
        images: [
            'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1592919016382-7463f2a6ad6a?q=80&w=2070&auto=format&fit=crop'
        ]
    },
    '베어크리크 포천': {
        logo: 'https://www.bearcreek.co.kr/images/common/logo.png',
        images: [
            'https://images.unsplash.com/photo-1622390764132-73602f235948?q=80&w=1974&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1596464531777-628f87063548?q=80&w=2070&auto=format&fit=crop'
        ]
    },
    'default': {
        logo: 'https://placehold.co/150x150/10b981/ffffff?text=GOLF',
        images: [
            'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop'
        ]
    }
};

export function getGolfCourseAssets(courseName: string) {
    if (courseName.includes('춘천')) return GOLF_COURSE_IMAGES['베어크리크 춘천'];
    if (courseName.includes('포천') || courseName.includes('베어크리크')) return GOLF_COURSE_IMAGES['베어크리크 포천'];
    return GOLF_COURSE_IMAGES['default'];
}
