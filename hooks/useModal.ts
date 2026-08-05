import { useState } from 'react';

const useModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    function openModal(content: any) {
        setModalContent(content);
        setIsModalOpen(true);
    }

    function closeModal() {
        setModalContent(null);
        setIsModalOpen(false);
    }

    return {
        isModalOpen,
        openModal,
        closeModal,
        modalContent,
    };
}
export default useModal;
