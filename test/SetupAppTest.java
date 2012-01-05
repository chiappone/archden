import java.net.URLEncoder;
import java.util.Map;

import org.junit.Test;

import play.libs.WS;
import play.libs.WS.HttpResponse;
import play.test.FunctionalTest;
import constants.Constants;
import data.QueryAppender;

public class SetupAppTest extends FunctionalTest {

	@Test
	public void createKeyspace() {

		String ws = Constants.WSURL + "/keyspace/archden";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

	}
	
	@Test
	public void dropCf() {
		String ws = Constants.WSURL + "/columnfamily/archden/locations";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).delete();

		System.out.println(res.getJson());
	}

	@Test
	public void createColumnFam() {

		String ws = Constants.WSURL
				+ "/columnfamily/archden/masstimes/UTF8TYPE";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

		ws = Constants.WSURL + "/columnfamily/archden/locations/UTF8TYPE";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());

	}

	@Test
	public void createColIndex() {

		String ws = Constants.WSURL
				+ "/column/archden/masstimes/timeofday/INTEGERTYPE?isIndex=true";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

		ws = Constants.WSURL
				+ "/column/archden/masstimes/dayofweek/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());
		
		ws = Constants.WSURL
				+ "/column/archden/masstimes/name/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());

		ws = Constants.WSURL
				+ "/column/archden/locations/name/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());
	}
}