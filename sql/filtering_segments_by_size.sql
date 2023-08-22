--select distinct(c2) from cgeo_180209_11m_22012020_5cm_fix_segmented 
with disabled as (select segment_id from cgeo_180209_11m_22012020_5cm_fix_attributes where npoints < 2000 OR status  = 'discarded')
update cgeo_180209_11m_22012020_5cm_fix_segmented set enabled = false where id_rand_4_merged in (select * from disabled)

update cgeo_180209_11m_22012020_5cm_fix_segmented set enabled = false where id_rand_4_merged in (65108,165051,126608,458482,136705,141351,246290,265795,181359,181198,58012,175,233943,393895,248289,183198)


update cgeo_180209_11m_22012020_5cm_fix_segmented set enabled = true where enabled is null

select count(*) from  cgeo_180209_11m_22012020_5cm_fix_segmented where enabled = false