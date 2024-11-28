document.addEventListener('DOMContentLoaded', function () {
    // URL 파라미터에서 방 정보 가져오기
    const params = new URLSearchParams(window.location.search);
    const roomNumber = params.get('roomNumber');
    const roomType = params.get('roomType');

    if (roomNumber) document.getElementById('roomNumber').value = roomNumber;
    if (roomType) document.getElementById('roomType').value = roomType;

    // 예약 폼 제출 처리
    document.getElementById('reservationForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            roomNumber: document.getElementById('roomNumber').value,
            roomType: document.getElementById('roomType').value,
            checkinDt: document.getElementById('checkinDt').value,
            checkoutDt: document.getElementById('checkoutDt').value
        };

        try {
            // 1. 예약 정보 저장
            const reservationResponse = await fetch('/api/reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const reservationResult = await reservationResponse.json();

            if (reservationResult.success) {
                // 2. 방 상태 업데이트
                const updateResponse = await fetch(`/api/room/${formData.roomNumber}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: '예약됨' })
                });

                const updateResult = await updateResponse.json();

                if (updateResult.success) {
                    alert('예약이 완료되었습니다.');
                    window.location.href = '/room-management'; // 메인 페이지로 이동
                } else {
                    alert('방 상태 업데이트에 실패했습니다.');
                }
            } else {
                alert(reservationResult.message || '예약에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('예약 처리 중 오류가 발생했습니다.');
        }
    });

    // 취소 버튼 처리
    document.getElementById('cancelButton').addEventListener('click', function () {
        window.location.href = '/room-management';
    });
});