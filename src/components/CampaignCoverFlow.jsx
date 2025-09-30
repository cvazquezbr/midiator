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
        // Mobile-first settings
        effect={'slide'}
        slidesPerView={1}
        spaceBetween={10}

        coverflowEffect={{
          rotate: 50,
          stretch: -20,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}

        breakpoints={{
          768: {
            effect: 'coverflow',
            slidesPerView: 'auto',
            spaceBetween: 0,
          },
        }}
      >
        {campaigns.map((campaign) => (
          <SwiperSlide key={campaign.id} style={{ width: '80%', maxWidth: '280px' }}>
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