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
  // The coverflow effect with slidesPerView=3 requires at least 3 slides to work correctly.
  // This flag determines which Swiper configuration to use.
  const hasEnoughCampaignsForCoverflow = campaigns.length >= 3;

  return (
    <Box sx={{ py: 4 }}>
      <Swiper
        onSwiper={onSwiper}
        grabCursor={true}
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
        // Conditionally apply props based on the number of campaigns
        {...(hasEnoughCampaignsForCoverflow
          ? { // --- Coverflow Configuration (for >= 3 campaigns) ---
              effect: 'coverflow',
              centeredSlides: true,
              breakpoints: {
                // For mobile
                0: {
                  slidesPerView: 3,
                  coverflowEffect: { rotate: 25, stretch: -20, depth: 100, modifier: 1, slideShadows: true },
                },
                // For tablet and desktop
                768: {
                  slidesPerView: 3,
                  coverflowEffect: { rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true },
                },
              },
            }
          : { // --- Simple Slider Configuration (for < 3 campaigns) ---
              effect: 'slide',
              slidesPerView: 1,
              centeredSlides: true, // Center the single slide(s)
              spaceBetween: 10,
            }
        )}
      >
        {campaigns.map((campaign) => (
          // When not in coverflow mode, we must constrain the slide width manually.
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