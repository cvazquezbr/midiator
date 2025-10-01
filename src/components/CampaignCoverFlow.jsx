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
  const hasEnoughCampaignsForCoverflow = campaigns.length >= 3;

  const swiperParams = {
    onSwiper,
    grabCursor: true,
    initialSlide,
    navigation: true,
    pagination: { clickable: true },
    modules: [EffectCoverflow, Pagination, Navigation],
    onSlideChange: (swiper) => onSlideChange(swiper.realIndex),
    className: "mySwiper",
    style: {
      '--swiper-navigation-color': '#fff',
      '--swiper-pagination-color': '#fff',
    },
  };

  if (hasEnoughCampaignsForCoverflow) {
    swiperParams.effect = 'coverflow';
    swiperParams.centeredSlides = true;
    swiperParams.slidesPerView = 3;
    swiperParams.coverflowEffect = {
      rotate: 25,
      stretch: -20,
      depth: 100,
      modifier: 1,
      slideShadows: true,
    };
    swiperParams.breakpoints = {
      768: {
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        },
      },
    };
  } else {
    swiperParams.effect = 'slide';
    swiperParams.slidesPerView = 1;
    swiperParams.centeredSlides = true;
    swiperParams.spaceBetween = 10;
  }

  return (
    <Box sx={{ py: 4 }}>
      <Swiper {...swiperParams}>
        {campaigns.map((campaign) => (
          <SwiperSlide key={campaign.id} style={!hasEnoughCampaignsForCoverflow ? { width: '80%', maxWidth: '280px' } : {}}>
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