package com.peekle.domain.study.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.dto.chat.ChatMessageRequest;

import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyChatRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatPersistenceService {

    private final StudyChatRepository studyChatRepository;
    private final StudyRoomRepository studyRoomRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Async
    @Transactional
    public void saveChatToDB(Long studyId, Long userId, ChatMessageRequest request) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                    .orElseThrow(() -> new IllegalArgumentException("Study not found: " + studyId));

            StudyChatLog parent = null;
            if (request.getParentId() != null) {
                parent = studyChatRepository.findById(request.getParentId()).orElse(null);
            }

            String metadataJson = null;
            if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
                metadataJson = objectMapper.writeValueAsString(request.getMetadata());
            }

            StudyChatLog chatLog = StudyChatLog.builder()
                    .study(studyRoom)
                    .user(user)
                    .message(request.getContent())
                    .type(request.getType())
                    .parent(parent)
                    .metadata(metadataJson)
                    .build();

            studyChatRepository.save(chatLog);
        } catch (Exception e) {
            log.error("Failed to save chat to DB asynchronously", e);
        }
    }
}
