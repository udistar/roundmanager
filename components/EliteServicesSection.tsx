
import React from 'react';

const EliteServicesSection: React.FC = () => {
    /* 
    const services = [
        {
            icon: 'fa-bell',
            title: '취소티 알림',
            desc: '놓치기 아쉬운 인기 타임, 설정한 시간대에 빈자리가 생기면 즉시 알림을 드립니다.',
            tag: 'HOT',
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10'
        },
        {
            icon: 'fa-users',
            title: '실시간 조인',
            desc: '매너 좋은 골퍼들과의 설레는 만남. 채팅과 후기 시스템으로 신뢰할 수 있는 라운딩.',
            tag: 'NEW',
            color: 'text-sky-500',
            bgColor: 'bg-sky-500/10'
        },
        {
            icon: 'fa-calendar-days',
            title: '통합 캘린더',
            desc: '여러 골프장 공식 홈페이지의 잔여 티타임을 한곳에서 가격별, 시간별로 비교하세요.',
            tag: 'POPULAR',
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10'
        },
        {
            icon: 'fa-camera-retro',
            title: '스코어 기록 AI',
            desc: '스코어카드 사진 한 장으로 동반자 스코어까지 자동 인식. 연도별 실력 분석 리포트 제공.',
            tag: 'SMART',
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10'
        }
    ];
    */

    return null;

    /*
    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-4">
                <div className="h-10 w-1 bg-emerald-500"></div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                    Rounding Manager <span className="text-emerald-500">Premium Services</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service, idx) => (
                    <div key={idx} className="luxury-glass p-8 rounded-[32px] border luxury-border hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                        <div className={`absolute -right-8 -top-8 w-32 h-32 ${service.bgColor} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl ${service.bgColor} flex items-center justify-center ${service.color} text-2xl`}>
                                    <i className={`fa-solid ${service.icon}`}></i>
                                </div>
                                <span className={`px-3 py-1 rounded-full ${service.bgColor} ${service.color} text-[9px] font-black uppercase tracking-widest`}>
                                    {service.tag}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
                                {service.desc}
                            </p>

                            <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center space-x-2">
                                <span>서비스 이용하기</span>
                                <i className="fa-solid fa-chevron-right text-[8px]"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    */
};

export default EliteServicesSection;
