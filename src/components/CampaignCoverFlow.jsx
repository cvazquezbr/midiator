import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';
import CampaignCard from './CampaignCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import { Box } from '@mui/material';

const CampaignCoverFlow = ({ campaigns, onEditCampaign, onDeleteCampaign, onSlideChange, initialSlide, onSwiper }) => {
  return (
    <Box sx={{ py: 4 }}>
      <Swiper
        onSwiper={onSwiper}
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        initialSlide={initialSlide}
        navigation={true}
        pagination={{ clickable: true }}
        modules={[EffectCoverflow, Pagination, Navigation]}
        onSlideChange={(swiper) => onSlideChange(swiper.realIndex)}
        className="mySwiper"
        style={{
          '--swiper-navigation-color': '#fff',
          '--swiper-pagination-color': '#fff',
        }}
        breakpoints={{
          // For mobile
          0: {
            slidesPerView: 3,
            coverflowEffect: {
              rotate: 25,
              stretch: -20,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            },
          },
          // For tablet and desktop
          768: {
            slidesPerView: 3,
            coverflowEffect: {
              rotate: 50,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            },
          },
        }}
      >
        {campaigns.map((campaign) => (
          <SwiperSlide key={campaign.id}>
            {({ isActive }) => (
              <CampaignCard
                campaign={campaign}
                onEditCampaign={onEditCampaign}
                onDeleteCampaign={onDeleteCampaign}
                isCoverFlowActive={isActive}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
};

export default CampaignCoverFlow;