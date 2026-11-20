package com.cinemabooking.config;

import com.cinemabooking.realtime.ChatEventSubscriber;
import com.cinemabooking.realtime.SeatEventPublisher;
import com.cinemabooking.realtime.SeatEventSubscriber;
import com.cinemabooking.service.ChatEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class RedisRealtimeEventConfig {
    @Bean
    RedisMessageListenerContainer realtimeEventListenerContainer(
            RedisConnectionFactory connectionFactory,
            SeatEventSubscriber seatSubscriber,
            ChatEventSubscriber chatSubscriber) {
        var container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(seatSubscriber, new ChannelTopic(SeatEventPublisher.CHANNEL));
        container.addMessageListener(seatSubscriber, new PatternTopic("__keyevent@*__:expired"));
        container.addMessageListener(chatSubscriber, new ChannelTopic(ChatEventPublisher.CHANNEL));
        return container;
    }
}
