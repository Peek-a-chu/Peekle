#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    loop {}
}

#[no_mangle]
pub unsafe extern "C" fn simplify_radial(
    points_ptr: *const f32,
    count: u32,
    epsilon_sq: f32,
    out_ptr: *mut u32,
) -> u32 {
    if count == 0 {
        return 0;
    }

    let mut kept = 0_u32;
    *out_ptr.add(kept as usize) = 0;
    kept += 1;

    let mut last_x = *points_ptr;
    let mut last_y = *points_ptr.add(1);

    let mut index = 1_u32;
    while index + 1 < count {
        let point_offset = index as usize * 2;
        let x = *points_ptr.add(point_offset);
        let y = *points_ptr.add(point_offset + 1);
        let dx = x - last_x;
        let dy = y - last_y;

        if dx * dx + dy * dy >= epsilon_sq {
            *out_ptr.add(kept as usize) = index;
            kept += 1;
            last_x = x;
            last_y = y;
        }

        index += 1;
    }

    if count > 1 && *out_ptr.add((kept - 1) as usize) != count - 1 {
        *out_ptr.add(kept as usize) = count - 1;
        kept += 1;
    }

    kept
}
