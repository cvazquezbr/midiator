import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';
import CampaignCard from './CampaignCard';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import { Box } from '@mui/material';

const CampaignCoverFlow = ({ campaigns, onEditCampaign, onDeleteCampaign, onSlideChange, initialSlide, onSwiper }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));

  // Configurações responsivas para diferentes breakpoints
  const getResponsiveConfig = () => {
    if (isXs) {
      return {
        slidesPerView: 1.2,
        spaceBetween: 10,
        coverflowEffect: {
          rotate: 30,
          stretch: 0,
          depth: 80,
          modifier: 1,
          slideShadows: true,
        },
        slideWidth: '85%',
        maxWidth: '280px',
        containerHeight: '400px'
      };
    } else if (isSm) {
      return {
        slidesPerView: 1.8,
        spaceBetween: 15,
        coverflowEffect: {
          rotate: 40,
          stretch: 0,
          depth: 90,
          modifier: 1,
          slideShadows: true,
        },
        slideWidth: '75%',
        maxWidth: '300px',
        containerHeight: '450px'
      };
    } else if (isMd) {
      return {
        slidesPerView: 2.5,
        spaceBetween: 20,
        coverflowEffect: {
          rotate: 45,
          stretch: 0,
          depth: 95,
          modifier: 1,
          slideShadows: true,
        },
        slideWidth: '70%',
        maxWidth: '320px',
        containerHeight: '500px'
      };
    } else {
      return {
        slidesPerView: 3,
        spaceBetween: 25,
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        },
        slideWidth: '65%',
        maxWidth: '350px',
        containerHeight: '550px'
      };
    }
  };

  const config = getResponsiveConfig();

  return (
    <Box 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        height: config.containerHeight,
        display: 'flex',
        alignItems: 'center',
        '& .swiper': {
          width: '100%',
          height: '100%',
          paddingTop: '20px',
          paddingBottom: '50px',
        },
        '& .swiper-slide': {
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        '& .swiper-pagination': {
          bottom: '10px !important',
        },
        '& .swiper-button-next, & .swiper-button-prev': {
          color: theme.palette.primary.main,
          '&:after': {
            fontSize: { xs: '20px', sm: '25px', md: '30px' },
          },
        },
        '& .swiper-button-next': {
          right: { xs: '10px', sm: '20px' },
        },
        '& .swiper-button-prev': {
          left: { xs: '10px', sm: '20px' },
        },
      }}
    >
      <Swiper
        onSwiper={onSwiper}
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={config.slidesPerView}
        spaceBetween={config.spaceBetween}
        initialSlide={initialSlide}
        coverflowEffect={config.coverflowEffect}
        pagination={{ 
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={true}
        modules={[EffectCoverflow, Pagination, Navigation]}
        onSlideChange={(swiper) => onSlideChange(swiper.realIndex)}
        className="mySwiper"
        breakpoints={{
          320: {
            slidesPerView: 1.2,
            spaceBetween: 10,
          },
          600: {
            slidesPerView: 1.8,
            spaceBetween: 15,
          },
          960: {
            slidesPerView: 2.5,
            spaceBetween: 20,
          },
          1280: {
            slidesPerView: 3,
            spaceBetween: 25,
          },
        }}
      >
        {campaigns.map((campaign) => (
          <SwiperSlide 
            key={campaign.id} 
            style={{ 
              width: config.slideWidth, 
              maxWidth: config.maxWidth,
              height: 'auto',
            }}
          >
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