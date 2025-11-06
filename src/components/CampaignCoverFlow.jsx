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

const CampaignCoverFlow = ({ campaigns, onEditCampaign, onDeleteCampaign, onShareCampaign, onCloneCampaign, onSlideChange, initialSlide, onSwiper }) => {
  return (
    // This outer box centers the Swiper component and constrains its width,
    // which is the key to preventing the layout calculation bug.
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{
        py: 4,
        width: '100%',
        // On mobile, constrain the width to prevent the wrapper from expanding infinitely.
        // This directly addresses the user's finding from the inspector.
        maxWidth: '320px',
        // On desktop, allow it to take more space.
        '@media (min-width: 768px)': {
          maxWidth: '65vw'
        }
      }}>
        <Swiper
          onSwiper={onSwiper}
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'} // 'auto' is best for coverflow with defined slide widths
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
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
        >
          {campaigns.map((campaign) => (
            // By giving the slide a clear width, `slidesPerView: 'auto'` works reliably.
            // This setup ensures ~3 slides are visible without horizontal scroll.
            <SwiperSlide key={campaign.id} style={{ width: '280px' }}>
              {({ isActive }) => (
                <CampaignCard
                  campaign={campaign}
                  onEditCampaign={onEditCampaign}
                  onDeleteCampaign={onDeleteCampaign}
                  onShareCampaign={onShareCampaign}
                   onCloneCampaign={onCloneCampaign}
                  isCoverFlowActive={isActive}
                />
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
    </Box>
  );
};

export default CampaignCoverFlow;