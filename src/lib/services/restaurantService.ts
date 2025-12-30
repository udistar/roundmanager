import axios from 'axios';
import { Restaurant } from '@/types';

export async function getRecommendations(
    courseName: string,
    _teeTime: string,
    type: 'PRE_ROUND' | 'POST_ROUND'
): Promise<Restaurant[]> {
    try {
        const query = type === 'PRE_ROUND'
            ? `${courseName} 아침식사 맛집`
            : `${courseName} 맛집`;

        const response = await axios.get('/naver-search/v1/search/local.json', {
            params: {
                query: query,
                display: 5,
                sort: 'comment'
            },
            headers: {
                'X-Naver-Client-Id': import.meta.env.VITE_NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': import.meta.env.VITE_NAVER_CLIENT_SECRET
            }
        });

        // HTML 태그(<b> 등) 제거 및 데이터 변환
        const items = response.data.items.map((item: any, idx: number) => ({
            id: `naver-${idx}`,
            name: item.title.replace(/<[^>]*>?/gm, ''),
            type: item.category,
            category: type,
            rating: 4.5 + (Math.random() * 0.5), // 네이버 검색 API는 평점을 직접 주지 않으므로 랜덤 부여 (기존 UI 유지)
            openTime: type === 'PRE_ROUND' ? '05:00' : '11:00',
            distanceFromCourse: Math.floor(Math.random() * 5) + 1,
            address: item.roadAddress || item.address,
            menu: [
                { name: 'Representative Menu', price: 15000 }
            ]
        }));

        return items;
    } catch (error) {
        console.error("Failed to fetch restaurant data:", error);
        return [];
    }
}

